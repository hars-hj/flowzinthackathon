
import { Groq } from "groq-sdk";
import {supabaseAdmin} from '../../lib/supabaseClient.js';
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

const NO_CONTEXT_ANSWER="I don't have that information, please contact our sales team.";
const FALLBACK_ANSWER="Sorry, I'm having trouble answering right now — please try again later or contact our team";
//  Embed the user's question 
export async function embedQuery(question: string): Promise<number[]> {
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

async function rerankChunks(question: string, chunks: Chunk[]): Promise<Chunk[]> {
  if(chunks.length<2) return chunks;
  console.log("RERANKING STARTED")
  const scores= await Promise.all(
    chunks.map(async (chunk)=> {
      const response= await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Score how relevant this document chunk is to the question on a scale of 0-10. Reply with ONLY a single number, nothing else.",
          },
          {
            role: "user",
            content: `Question: ${question}\n\nChunk: ${chunk.content.slice(0, 400)}`,
          },
        ],
        max_tokens: 5,
        temperature: 0,
      });

      const score= parseFloat(response.choices[0].message.content?.trim() ?? "5");
      return { chunk, score: isNaN(score) ? 5 : score };  // default 5 not 0
    })
  );
  console.log("RERANKING ENDED: ", scores)
  return scores.sort((a, b)=> b.score-a.score).map((s) => s.chunk);
}

export async function retrieveChunks(queryEmbedding: number[], keywords: string): Promise<Chunk[]> {
  console.log("RETRIEVE CHUNKS")
  const [vectorResults, keywordResults]= await Promise.all([
    supabaseAdmin.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_count: 8,
      match_threshold: 0.5,
    }),
    supabaseAdmin
      .from("document_chunks")
      .select("id, filename, content, page, chunk_index")
      .textSearch("fts", keywords, { type: "websearch" })
      .limit(8),
  ]);

  if (vectorResults.error) throw new Error(`Vector search failed: ${vectorResults.error.message}`);
  const RRF_K= 60;
  const scores= new Map<string, { chunk: Chunk; score: number }>();

  const seen= new Set<string>();
  (vectorResults.data ?? []).forEach((chunk: Chunk, rank: number) => {
    const key= `${chunk.filename}-${chunk.chunk_index}`;
    const rrfScore= 1/(RRF_K+rank+1);
    if (!seen.has(key)) {
      seen.add(key);
      scores.set(key, { chunk, score: rrfScore });
    }
  });

  (keywordResults.data ?? []).forEach((chunk: any, rank: number) => {
    const key= `${chunk.filename}-${chunk.chunk_index}`;
    const rrfScore= 1/(RRF_K+rank+1);
    const existing= scores.get(key);
    if (existing) {
      existing.score+= rrfScore;
    } else if (!seen.has(key)) {
      seen.add(key);
      scores.set(key, { chunk: { ...chunk, similarity: 0 }, score: rrfScore });
    }
  });
  console.log("RETRIEVE CHUNKS ENDED", scores)
  return Array.from(scores.values()).sort((a, b)=> b.score - a.score).slice(0, 5).map((s)=> s.chunk);
}

//  Fetch the last N messages for this session 
async function getConversationHistory(sessionId: string, limit = 10): Promise<Message[]> {
  const { data, error } = await supabaseAdmin
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
  await supabaseAdmin.from("conversations").insert({ session_id: sessionId, role, content });
}

//  Build the prompt and call the LLM 
async function generateAnswer(
  question: string,
  chunks: Chunk[],
  history: Message[]
): Promise<string> {
  console.log("GENERATE ANSWER CALLED")
  const context = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.filename}, page ${c.page}]\n${c.content}`)
    .join("\n\n---\n\n");

  const systemPrompt = `You are a helpful sales support assistant for our company.

STRICT RULES — follow these exactly, no exceptions:
1. Answer ONLY using the COMPANY INFORMATION provided below. Never add information from outside it.
2. If the context gives a clear condition (e.g. "within 14 days"), treat it as a hard cutoff. Do NOT speculate about what might happen outside that condition.
3. If a situation falls outside what the context covers, say: "I don't have that detail — please contact our team at support@nexasupport.ai"
4. Never use phrases like "may be eligible", "might", "could potentially" unless those exact words appear in the source. Hedging language invents uncertainty that may not exist.
5. If the answer is simply "no" — say no clearly and explain why, then stop.
6. Never contradict yourself within a single answer.
7. If the answer is not in the provided context, say "I don't have that information, please contact our sales team."
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
    temperature: 0.1,
  });
  console.log("GENERATE ANSWER ENDED", response.choices[0].message)
  return response.choices[0].message.content ?? "Sorry, I could not generate a response.";
}


// Main exported function: the full RAG pipeline 
export async function chat(sessionId: string, question: string): Promise<string> {
  try {
    console.log("CHAT");
    const queryEmbedding = await embedQuery(question);
    const keywords= question.split(" ").slice(0, 6).join(" | ");
    const [rawChunks, history] = await Promise.all([
      retrieveChunks(queryEmbedding, keywords),
      getConversationHistory(sessionId),
    ]);

    if (!rawChunks || rawChunks.length=== 0) {
      await saveMessage(sessionId, "user", question);
      await saveMessage(sessionId, "assistant", NO_CONTEXT_ANSWER);
      return NO_CONTEXT_ANSWER;
    }
    const chunks= await rerankChunks(question, rawChunks);

    const answer= await generateAnswer(question, chunks, history);
    await Promise.all([
      saveMessage(sessionId, "user", question),
      saveMessage(sessionId, "assistant", answer),
    ]);
    console.log("CHATEND");
    return answer;
  } catch (err) {
    console.error("RAG chat pipeline failed:", err);
    return FALLBACK_ANSWER;
  }
}