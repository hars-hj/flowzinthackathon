import express from 'express';
import { chatHandler } from '../controllers/chatbotController.js';

const router = express.Router();

router.post('/', chatHandler);

export default router;
