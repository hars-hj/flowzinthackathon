import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({
    apiKey: process.env.EMBEDING_API_KEY,
});
export async function embedChunks(chunks) {
    const embeddedChunks = [];
    const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: chunks.map(chunk => chunk.content),
    });
    if (!response.embeddings) {
        throw new Error("Embedding response missing embeddings");
    }
    const embeddings = response.embeddings;
    return chunks.map((chunk, i) => ({
        ...chunk,
        embedding: embeddings[i].values,
    }));
}
