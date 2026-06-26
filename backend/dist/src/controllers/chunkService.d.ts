type Chunk = {
    content: string;
    metadata: {
        filename: string;
        chunkIndex: number;
        page: number;
    };
};
type Page = {
    page: number;
    markdown: string;
};
export declare function chunkMarkdown(filename: string, pages: Page[]): Promise<Chunk[]>;
export {};
