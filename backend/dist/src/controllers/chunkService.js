import { MarkdownTextSplitter } from "@langchain/textsplitters";
export async function chunkMarkdown(filename, pages) {
    const splitter = new MarkdownTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 150,
    });
    const texts = pages.map((p) => p.markdown);
    const metadatas = pages.map((p) => ({
        filename,
        page: p.page,
    }));
    const docs = await splitter.createDocuments(texts, metadatas);
    return docs.map((doc, index) => ({
        content: doc.pageContent,
        metadata: {
            filename,
            chunkIndex: index,
            page: doc.metadata.page,
        },
    }));
}
