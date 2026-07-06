import express from 'express';
import cors from "cors";
import { createServer } from 'http';
import type { Request, Response } from 'express';
import chatRoutes from './routes/chatRoutes.js';
import uploadRouter from './routes/uploadFile.js';
import authRoutes from './routes/authRouter.js';
import ticketRoutes from './routes/ticketRouter.js';
import { initSocket } from './socket.js';

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/chat', chatRoutes);
app.use('/api/uploadFile', uploadRouter);
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send({ status: 'backend running', message: 'Chatbot API is available at /api/chat' });
});

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});