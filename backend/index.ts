import express from 'express';
import type { Request, Response } from 'express';
import chatRoutes from './routes/chatRoutes.ts';

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use('/api/chat', chatRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send({ status: 'backend running', message: 'Chatbot API is available at /api/chat' });
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});
