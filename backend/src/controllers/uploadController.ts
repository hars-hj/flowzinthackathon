import express from "express";
import axios from "axios";
import FormData from "form-data";
import {chunkMarkdown} from "./chunkService.js";
import { embedChunks } from "./embeddingService.js";
import { storeEmbeddings } from "./embeddingToDb.js";
import { supabaseAdmin } from "../../lib/supabaseClient.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

 async function uploadFile(req: express.Request, res: express.Response) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    error: "No file uploaded",
                });
            }

            const form = new FormData();

            form.append(
                "file",
                req.file.buffer,
                req.file.originalname
            );

            const response = await axios.post(
                "http://localhost:8000/parse",
                form,
                {
                    headers: form.getHeaders(),
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                }
            );

            // create chunks from markdown
            const pages = response.data.pages;
            const filename = response.data.filename;

            // create chunks from markdown
             const chunks = await chunkMarkdown(filename, pages);

            // create embeddings for chunks
            const embeddings = await embedChunks(chunks);
           
            
            // store chunks and embeddings in database
            
            const data = await storeEmbeddings(embeddings);
            
            return res.status(200).json({
                message: "File uploaded and processed successfully",
               
            });
        } catch (err) {
            console.error(err);

            return res.status(500).json({
                error: "Parser service failed",
            });
        }
    }

async function listFiles(req: AuthenticatedRequest, res: express.Response) {
    try {
        const { data, error } = await supabaseAdmin
            .from("document_chunks")
            .select("document_id, filename");

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        const fileMap = new Map<
            string,
            { documentId: string; filename: string; chunkCount: number }
        >();

        for (const row of data ?? []) {
            const existing = fileMap.get(row.document_id);
            if (existing) {
                existing.chunkCount += 1;
            } else {
                fileMap.set(row.document_id, {
                    documentId: row.document_id,
                    filename: row.filename,
                    chunkCount: 1,
                });
            }
        }

        return res.status(200).json({ files: Array.from(fileMap.values()) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to list files" });
    }
}

export { uploadFile, listFiles };