import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireUser } from '../middleware/role.middleware.js';
//import { chatHandler, getSessionsHandler, deleteSessionHandler } from '../controllers/chatbotController.js';
import { embedQuery, retrieveChunks ,chat} from '../controllers/ragService.js';
import { supabaseAdmin } from '../lib/supabaseClient.js';
import { chatHandler } from '../controllers/chatController.widget.js';
const router = express.Router();

router.post('/', chatHandler);

//router.get('/sessions', authenticateToken, getSessionsHandler);
// router.post('/', authenticateToken, chatHandler);
//router.delete('/:sessionId', authenticateToken, deleteSessionHandler);

// route to test the RAG based bot response with debug information
// router.post("/debug", async (req, res) => {
//   const { message, sessionId }=req.body;
//   const embedding = await embedQuery(message);
//   const keywords = message.split(" ").slice(0, 6).join(" | ");
//   const chunks = await retrieveChunks(embedding, keywords);
//   const answer = await chat(sessionId, message);
//   res.json({
//     question: message,
//     retrieved: chunks.map(c => ({
//       similarity: c.similarity.toFixed(3),
//       source: c.filename,
//       page: c.page,
//       preview: c.content.slice(0, 200) + "...",
//     })),
//     response: answer,
//   });
// });

router.get("/analytics", authenticateToken, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("query_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const total = data.length;
  const avgLatency = Math.round(data.reduce((sum, r) => sum + r.latency_ms, 0) / (total || 1));
  const escalations = data.filter((r) => r.escalated).length;
  const noContextCount = data.filter((r) => r.final_answer === "I don't have that information, please contact our sales team.").length;

  const questionFreq = data.reduce((acc: Record<string, number>, r) => {
    acc[r.question] = (acc[r.question] || 0) + 1;
    return acc;
  }, {});

  const topQuestions = Object.entries(questionFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([question, count]) => ({ question, count }));

  return res.json({
    total_queries: total,
    avg_latency_ms: avgLatency,
    escalation_rate: total ? `${((escalations / total) * 100).toFixed(1)}%` : "0%",
    no_context_rate: total ? `${((noContextCount / total) * 100).toFixed(1)}%` : "0%",
    top_questions: topQuestions,
    recent_queries: data.slice(0, 20),
  });
});

export default router;
