
import { fileURLToPath } from "url";

import express from 'express';
import cors from "cors";
import { createServer } from 'http';
import type { Request, Response } from 'express';
import chatRoutes from './routes/chatRoutes.js';
import uploadRouter from './routes/uploadFile.js';
import authRoutes from './routes/authRouter.js';
import ticketRoutes from './routes/ticketRouter.js';
import { initSocket } from './socket.js';
import widgetConfigRouter from './routes/widgetRouter.js';
import conversationRoutes from './routes/conversations.js';
import settingRouter from './routes/setting.js';
import path from 'path/win32';
import manageAgentsRouter from './routes/manageAgents.js';

const app = express();
const port = process.env.PORT || 4000;


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(
  cors({
    origin: "*",
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
app.use('/api/widget-config', widgetConfigRouter);
// widget testing 
app.use(express.static(path.join(__dirname, "../public")));+
app.use('/api/conversations',conversationRoutes);
app.use('/api/settings', settingRouter);
app.use('/api/manageAgents', manageAgentsRouter);

app.get('/', (req: Request, res: Response) => {
  res.send({ status: 'backend running', message: 'Chatbot API is available at /api/chat' });
});

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});