import { Groq } from "groq-sdk";
import { supabaseAdmin } from '../../lib/supabaseClient.js';
import { GoogleGenAI } from "@google/genai/web";
// --- Clients ---
const embeddingsModel = new GoogleGenAI({
    apiKey: process.env.EMBEDING_API_KEY,
});
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});
const NO_CONTEXT_ANSWER = "I don't have that information, please contact our sales team.";
const FALLBACK_ANSWER = "Sorry, I'm having trouble answering right now — please try again later or contact our team";
//  Embed the user's question 
export async function embedQuery(question) {
    const result = await embeddingsModel.models.embedContent({
        model: "gemini-embedding-001",
        contents: question,
    });
    if (!result.embeddings ||
        result.embeddings.length === 0 ||
        !result.embeddings[0].values) {
        throw new Error("Embedding generation failed.");
    }
    return result.embeddings[0].values;
}
export function reorderChunks(chunks) {
    if (chunks.length < 2)
        return chunks;
    const reordered = [...chunks];
    const [secondChunk] = reordered.splice(1, 1);
    reordered.push(secondChunk);
    return reordered;
}
//  Search for relevant chunks 
export async function retrieveChunks(queryEmbedding) {
    const { data, error } = await supabaseAdmin.rpc("match_chunks", {
        query_embedding: queryEmbedding,
        match_count: 5,
        match_threshold: 0.5,
    });
    if (error)
        throw new Error(`Vector search failed: ${error.message}`);
    return data;
}
//  Fetch the last N messages for this session 
async function getConversationHistory(sessionId, limit = 10) {
    const { data, error } = await supabaseAdmin
        .from("conversations")
        .select("role, content")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(limit);
    if (error)
        throw new Error(`History fetch failed: ${error.message}`);
    // Reverse so oldest message is first (chronological order for the LLM)
    return data.reverse();
}
//  Save a message to conversation history 
async function saveMessage(sessionId, role, content) {
    await supabaseAdmin.from("conversations").insert({ session_id: sessionId, role, content });
}
//  Build the prompt and call the LLM 
async function generateAnswer(question, chunks, history) {
    // Build context from retrieved chunks
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

7.if the answer is not in the provided context, say "I don't have that information, please contact our sales team."
Be concise, professional, and helpful.

COMPANY INFORMATION:
${context}`;
    const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: question },
    ];
    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: 1024,
        temperature: 0.1, // lower = more factual, less creative
    });
    return response.choices[0].message.content ?? "Sorry, I could not generate a response.";
}
// Main exported function: the full RAG pipeline 
export async function chat(sessionId, question) {
    try {
        const queryEmbedding = await embedQuery(question);
        const [rawChunks, history] = await Promise.all([
            retrieveChunks(queryEmbedding),
            getConversationHistory(sessionId),
        ]);
        const chunks = reorderChunks(rawChunks);
        if (!chunks || chunks.length === 0) {
            await saveMessage(sessionId, "user", question);
            await saveMessage(sessionId, "assistant", NO_CONTEXT_ANSWER);
            return NO_CONTEXT_ANSWER;
        }
        const answer = await generateAnswer(question, chunks, history);
        await Promise.all([
            saveMessage(sessionId, "user", question),
            saveMessage(sessionId, "assistant", answer),
        ]);
        return answer;
    }
    catch (err) {
        console.error("RAG chat pipeline failed:", err);
        return FALLBACK_ANSWER;
    }
}
