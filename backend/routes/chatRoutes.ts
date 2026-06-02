import express from 'express';
import { handleChat } from '../controllers/chatbotController.ts';

const router = express.Router();

router.post('/', handleChat);

export default router;
