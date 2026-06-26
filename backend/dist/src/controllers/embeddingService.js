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
    return chunks.map((chunk, i) => ({
        ...chunk,
        embedding: response.embeddings[i].values,
    }));
}
