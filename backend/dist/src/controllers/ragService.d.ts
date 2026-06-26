interface Chunk {
    id: string;
    filename: string;
    content: string;
    page: number;
    chunk_index: number;
    similarity: number;
}
export declare function embedQuery(question: string): Promise<number[]>;
export declare function reorderChunks(chunks: Chunk[]): Chunk[];
export declare function retrieveChunks(queryEmbedding: number[]): Promise<Chunk[]>;
export declare function chat(sessionId: string, question: string): Promise<string>;
export {};
