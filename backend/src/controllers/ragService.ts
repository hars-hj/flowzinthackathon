
import { Groq } from "groq-sdk";
import {supabase} from '../../lib/supabaseClient.js';
import { GoogleGenAI } from "@google/genai/web";

// --- Clients ---
const embeddingsModel = new GoogleGenAI({
    apiKey: process.env.EMBEDING_API_KEY!,
});



const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});


// --- Types ---
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Chunk {
  id: string;
  filename: string;
  content: string;
  page: number;
  chunk_index: number;
  similarity: number;
}

//  Embed the user's question 
async function embedQuery(question: string): Promise<number[]> {
  const result = await embeddingsModel.models.embedContent({
    model: "gemini-embedding-001",
    contents: question,
  });

  if (
    !result.embeddings ||
    result.embeddings.length === 0 ||
    !result.embeddings[0].values
  ) {
    throw new Error("Embedding generation failed.");
  }

  return result.embeddings[0].values;
}

//  Search for relevant chunks 
async function retrieveChunks(queryEmbedding: number[]): Promise<Chunk[]> {
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: 5,
    match_threshold: 0.5,
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);
  return data as Chunk[];
}

//  Fetch the last N messages for this session 
async function getConversationHistory(sessionId: string, limit = 10): Promise<Message[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`History fetch failed: ${error.message}`);

  // Reverse so oldest message is first (chronological order for the LLM)
  return (data as Message[]).reverse();
}

//  Save a message to conversation history 
async function saveMessage(sessionId: string, role: "user" | "assistant", content: string) {
  await supabase.from("conversations").insert({ session_id: sessionId, role, content });
}

//  Build the prompt and call the LLM 
async function generateAnswer(
  question: string,
  chunks: Chunk[],
  history: Message[]
): Promise<string> {
  // Build context from retrieved chunks
  const context = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.filename}, page ${c.page}]\n${c.content}`)
    .join("\n\n---\n\n");

  const systemPrompt = `You are a helpful sales support assistant for our company.
Answer questions using ONLY the provided company information below.
If the answer is not in the provided context, say "I don't have that information, please contact our sales team."
Be concise, professional, and helpful.

COMPANY INFORMATION:
${context}`;

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: question },
  ];

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    max_tokens: 1024,
    temperature: 0.3, // lower = more factual, less creative
  });

  return response.choices[0].message.content ?? "Sorry, I could not generate a response.";
}


// Main exported function: the full RAG pipeline 
export async function chat(sessionId: string, question: string): Promise<string> {
  //  Embed the question
  const queryEmbedding = await embedQuery(question);

  //  Retrieve relevant chunks in parallel with history fetch
  const [chunks, history] = await Promise.all([
    retrieveChunks(queryEmbedding),
    getConversationHistory(sessionId),
  ]);

  //  Save user message
  await saveMessage(sessionId, "user", question);

  //  Generate answer
  const answer = await generateAnswer(question, chunks, history);

  //  Save assistant message
  await saveMessage(sessionId, "assistant", answer);

  return answer;
}