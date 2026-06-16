import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import chatRoutes from './routes/chatRoutes.js';
import uploadRouter from './routes/uploadFile.js';
const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/chat', chatRoutes);
app.use('/api/uploadFile', uploadRouter);

app.get('/', (req: Request, res: Response) => {
  res.send({ status: 'backend running', message: 'Chatbot API is available at /api/chat' });
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});
