import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireUser } from '../middleware/role.middleware.js';
import { chatHandler } from '../controllers/chatbotController.js';
import { embedQuery, retrieveChunks ,chat} from '../controllers/ragService.js';
const router = express.Router();

router.post('/', authenticateToken, chatHandler);

// route to test the RAG based bot response with debug information
router.post("/debug", async (req, res) => {
  const { message,sessionId } = req.body;
  const embedding = await embedQuery(message);
  const chunks = await retrieveChunks(embedding);
  const answer = await chat(sessionId, message);
  res.json({
    question: message,
    retrieved: chunks.map(c => ({
      similarity: c.similarity.toFixed(3),
      source: c.filename,
      page: c.page,
      preview: c.content.slice(0, 200) + "..."
    })),
    response: answer
      
  });
});

export default router;
