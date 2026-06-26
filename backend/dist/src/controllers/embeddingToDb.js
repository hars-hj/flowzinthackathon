import { supabaseAdmin } from '../../lib/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
export async function storeEmbeddings(chunks) {
    const doc_id = uuidv4();
    const rows = chunks.map((chunk) => ({
        document_id: doc_id,
        filename: chunk.metadata.filename,
        chunk_index: chunk.metadata.chunkIndex,
        page: chunk.metadata.page,
        content: chunk.content,
        embedding: chunk.embedding
    }));
    const { data, error } = await supabaseAdmin
        .from("document_chunks")
        .insert(rows);
    if (error) {
        throw error;
    }
    return data;
}
