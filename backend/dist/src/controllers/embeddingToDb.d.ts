interface chunks {
    embedding: number[] | undefined;
    content: string;
    metadata: {
        filename: string;
        chunkIndex: number;
        page: number;
    };
}
export declare function storeEmbeddings(chunks: chunks[]): Promise<null>;
export {};
