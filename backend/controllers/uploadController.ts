import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import {chunkMarkdown} from "./chunkService.ts";
import { embedChunks } from "./embeddingService.ts";

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
            const markdown = response.data.markdown;
            const filename = response.data.filename;
            const chunks = await chunkMarkdown(filename, markdown);
            

            // create embeddings for chunks
            const embeddings = await embedChunks(chunks);
           
            return res.json({
               
                embeddings: embeddings
            });

        } catch (err) {
            console.error(err);

            return res.status(500).json({
                error: "Parser service failed",
            });
        }
    }

    export { uploadFile };