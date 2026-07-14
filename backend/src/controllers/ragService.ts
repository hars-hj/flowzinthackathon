import { Groq } from "groq-sdk";
import { supabaseAdmin } from '../lib/supabaseClient.js';
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

interface ChatResult {
  reply: string;
  escalated: boolean;
}

const NO_CONTEXT_ANSWER = "I don't have that information, please contact our support team.";
const FALLBACK_ANSWER = "Sorry, I'm having trouble answering right now — please try again later or contact our team";

// --- Embed the user's question ---
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
  if (chunks.length < 2) return chunks;

  const scores = await Promise.all(
    chunks.map(async (chunk) => {
      const response = await groq.chat.completions.create({
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

      const score = parseFloat(response.choices[0].message.content?.trim() ?? "5");
      return { chunk, score: isNaN(score) ? 5 : score };
    })
  );

  return scores.sort((a, b) => b.score - a.score).map((s) => s.chunk);
}

// NOTE: match_chunks RPC must be updated in Postgres to accept and filter
export async function retrieveChunks(
  orgId: string,
  queryEmbedding: number[],
  keywords: string
): Promise<Chunk[]> {
  const [vectorResults, keywordResults] = await Promise.all([
    supabaseAdmin.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_count: 8,
      match_threshold: 0.5,
      p_org_id: orgId,
    }),
    supabaseAdmin
      .from("document_chunks")
      .select("id, filename, content, page, chunk_index")
      .eq("org_id", orgId)
      .textSearch("fts", keywords, { type: "websearch" })
      .limit(8),
  ]);

  if (vectorResults.error) throw new Error(`Vector search failed: ${vectorResults.error.message}`);
  if (keywordResults.error) throw new Error(`Keyword search failed: ${keywordResults.error.message}`);

  const RRF_K = 60;
  const scores = new Map<string, { chunk: Chunk; score: number }>();
  const seen = new Set<string>();

  (vectorResults.data ?? []).forEach((chunk: Chunk, rank: number) => {
    const key = `${chunk.filename}-${chunk.chunk_index}`;
    const rrfScore = 1 / (RRF_K + rank + 1);
    if (!seen.has(key)) {
      seen.add(key);
      scores.set(key, { chunk, score: rrfScore });
    }
  });

  (keywordResults.data ?? []).forEach((chunk: any, rank: number) => {
    const key = `${chunk.filename}-${chunk.chunk_index}`;
    const rrfScore = 1 / (RRF_K + rank + 1);
    const existing = scores.get(key);
    if (existing) {
      existing.score += rrfScore;
    } else if (!seen.has(key)) {
      seen.add(key);
      scores.set(key, { chunk: { ...chunk, similarity: 0 }, score: rrfScore });
    }
  });

  return Array.from(scores.values()).sort((a, b) => b.score - a.score).slice(0, 5).map((s) => s.chunk);
}

// --- Fetch the last N messages for this session, scoped to org ---
async function getConversationHistory(orgId: string, sessionId: string, limit = 10): Promise<Message[]> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("role, content")
    .eq("org_id", orgId)
    .eq("session_id", sessionId)
    .order("seq", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`History fetch failed: ${error.message}`);

  return (data as Message[]).reverse();
}

// --- Save a message to conversation history ---
async function saveMessage(orgId: string, sessionId: string, role: "user" | "assistant", content: string) {
  await supabaseAdmin.from("conversations").insert({ org_id: orgId, session_id: sessionId, role, content });
}

// --- Build the prompt and call the LLM ---
export async function generateAnswer(
  question: string,
  chunks: Chunk[],
  history: Message[],
  supportContact: string
): Promise<string> {
  const context = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.filename}, page ${c.page}]\n${c.content}`)
    .join("\n\n---\n\n");

  const systemPrompt = `You are a helpful sales support assistant for our company.

STRICT RULES — follow these exactly, no exceptions:
1. Answer ONLY using the COMPANY INFORMATION provided below. Never add information from outside it.
2. If the context gives a clear condition (e.g. "within 14 days"), treat it as a hard cutoff. Do NOT speculate about what might happen outside that condition.
3. If a situation falls outside what the context covers, say: "I don't have that detail — please contact our team at ${supportContact}"
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

  return response.choices[0].message.content ?? "Sorry, I could not generate a response.";
}

async function logQuery(data: {
  orgId: string;
  sessionId: string;
  question: string;
  chunksRetrieved: number;
  topChunkScore: number;
  finalAnswer: string;
  latencyMs: number;
  escalated: boolean;
}) {
  await supabaseAdmin.from("query_logs").insert({
    org_id: data.orgId,
    session_id: data.sessionId,
    question: data.question,
    chunks_retrieved: data.chunksRetrieved,
    top_chunk_score: data.topChunkScore,
    final_answer: data.finalAnswer,
    latency_ms: data.latencyMs,
    escalated: data.escalated,
  });
}

// --- Fetch org-specific support contact for prompt + fallback messages ---
async function getSupportContact(orgId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("widget_configs")
    .select("support_email")
    .eq("org_id", orgId)
    .maybeSingle();

  return data?.support_email ?? "our support team";
}

// --- Main exported function: the full RAG pipeline, org-scoped ---
export async function chat(orgId: string, sessionId: string, question: string): Promise<ChatResult> {
  const start = Date.now();
  try {
    const [queryEmbedding, supportContact] = await Promise.all([
      embedQuery(question),
      getSupportContact(orgId),
    ]);
    const keywords = question.split(" ").slice(0, 6).join(" | ");

    const [rawChunks, history] = await Promise.all([
      retrieveChunks(orgId, queryEmbedding, keywords),
      getConversationHistory(orgId, sessionId),
    ]);

    if (!rawChunks || rawChunks.length === 0) {
      await saveMessage(orgId, sessionId, "user", question);
      await saveMessage(orgId, sessionId, "assistant", NO_CONTEXT_ANSWER);
      await logQuery({
        orgId,
        sessionId,
        question,
        chunksRetrieved: 0,
        topChunkScore: 0,
        finalAnswer: NO_CONTEXT_ANSWER,
        latencyMs: Date.now() - start,
        escalated: false,
      });
      return { reply: NO_CONTEXT_ANSWER, escalated: false };
    }

    const chunks = await rerankChunks(question, rawChunks);
    const answer = await generateAnswer(question, chunks, history, supportContact);

    await saveMessage(orgId, sessionId, "user", question);
    await saveMessage(orgId, sessionId, "assistant", answer);
    await logQuery({
      orgId,
      sessionId,
      question,
      chunksRetrieved: chunks.length,
      topChunkScore: chunks[0]?.similarity ?? 0,
      finalAnswer: answer,
      latencyMs: Date.now() - start,
      escalated: false, // TODO: wire in your escalation-detection model's result here
    });

    return { reply: answer, escalated: false };
  } catch (err) {
    console.error("RAG chat pipeline failed:", err);
    return { reply: FALLBACK_ANSWER, escalated: false };
  }
}