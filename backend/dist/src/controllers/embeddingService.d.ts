type Chunk = {
    content: string;
    metadata: {
        filename: string;
        chunkIndex: number;
        page: number;
    };
};
export declare function embedChunks(chunks: Chunk[]): Promise<{
    embedding: number[] | undefined;
    content: string;
    metadata: {
        filename: string;
        chunkIndex: number;
        page: number;
    };
}[]>;
export {};
