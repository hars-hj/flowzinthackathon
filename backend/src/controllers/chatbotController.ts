import { GoogleGenAI } from "@google/genai/web";
import { Groq } from "groq-sdk";
import {supabase} from '../../lib/supabaseClient.js';
import { chat } from './ragService.js';

 // chat handler to be used in router
export async function chatHandler(req: any,res:any):Promise<void> {
    const { sessionId, question } = req.body;
    if (!sessionId || !question) {
        res.status(400).json({ error: "Missing sessionId or question in request body" });
        return;
    }
    try{
        const reply = await chat(sessionId,question);
        res.json({"reply" : reply});

    } catch (error) {
        console.error("Error in chatHandler:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
