
import { chat } from './ragService.js';

 // chat handler to be used in router
export async function chatHandler(req: any,res:any):Promise<void> {
    const { sessionId, message, question } = req.body;
    const userMessage = message ?? question;
    if (!sessionId || !userMessage) {
        res.status(400).json({ error: "Missing sessionId or message in request body" });
        return;
    }
    try{
        const reply = await chat(sessionId, userMessage);
        res.json({"reply" : reply});

    } catch (error) {
        console.error("Error in chatHandler:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
