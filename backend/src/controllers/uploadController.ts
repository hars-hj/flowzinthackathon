import express from "express";
import axios from "axios";
import FormData from "form-data";
import {chunkMarkdown} from "./chunkService.js";
import { embedChunks } from "./embeddingService.js";
import { storeEmbeddings } from "./embeddingToDb.js";
import { supabaseAdmin } from "../lib/supabaseClient.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { createRemoteJWKSet, jwtVerify } from 'jose';

const SUPABASE_URL = process.env.SUPABASE_URL!;
 interface org {
     org_id: string;
}


 async function uploadFile(req: express.Request, res: express.Response) {
console.log("uploadFile called");
            const JWKS = createRemoteJWKSet(
        new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
        );

        try {
            if (!req.file) {
                return res.status(400).json({
                    error: "No file uploaded",
                });
            }

            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Missing or invalid authorization header' });
            }
            const token = authHeader.split(' ')[1];
             
            const { payload } = await jwtVerify(token, JWKS);
            const userId = payload.sub!;

            const results = await supabaseAdmin
            .from('organization_members')
            .select('org_id')
            .eq('user_id', userId)
            .single();

             if(results.error){
                console.error("failed to fetch orginazition Id using auth credentials of admin",results.error)
             }

             const org_id = results.data?.org_id as string;
            const form = new FormData();

            form.append(
                "file",
                req.file.buffer,
                req.file.originalname
            );

            const response = await axios.post(
                `${process.env.PARSER_URL}/parse`,
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
            
            const data = await storeEmbeddings(embeddings,org_id);
            
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

async function listFiles(req: express.Request, res: express.Response) {
    const JWKS = createRemoteJWKSet(
        new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
    );

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Missing or invalid authorization header",
            });
        }

        const token = authHeader.split(" ")[1];
        const { payload } = await jwtVerify(token, JWKS);
        const userId = payload.sub!;

        const { data: orgData, error: orgError } = await supabaseAdmin
            .from("organization_members")
            .select("org_id")
            .eq("user_id", userId)
            .single();

        if (orgError) {
            console.error(
                "Failed to fetch organization ID using auth credentials",
                orgError
            );
            return res.status(500).json({ error: "Failed to fetch organization" });
        }

        const org_id = orgData.org_id;

        const { data, error } = await supabaseAdmin
            .from("document_chunks")
            .select("document_id, filename")
            .eq("org_id", org_id);

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

        return res.status(200).json({
            files: Array.from(fileMap.values()),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: "Failed to list files",
        });
    }
}

export { uploadFile, listFiles };