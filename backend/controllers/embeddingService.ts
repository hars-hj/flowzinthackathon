import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.EMBEDING_API_KEY!,
});

type Chunk = {
    content: string;
    metadata: {
        filename: string;
        chunkIndex: number;
    };
};

export async function embedChunks(chunks: Chunk[]) {
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