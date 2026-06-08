import { MarkdownTextSplitter } from "@langchain/textsplitters";

type Chunk = {
    content: string;
    metadata: {
        filename: string;
        chunkIndex: number;
    };
};

export async function chunkMarkdown(
    filename: string,
    markdown: string
): Promise<Chunk[]> {
    const splitter = new MarkdownTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 150,
    });

    const docs = await splitter.createDocuments([markdown]);

    return docs.map((doc, index) => ({
        content: doc.pageContent,
        metadata: {
            filename,
            chunkIndex: index,
        },
    }));
}