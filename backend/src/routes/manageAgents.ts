import express from 'express';
    
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js'; // adjust path to match your filename

import { getAgents, deleteAgent,createAgent } from '../controllers/manageAgents.js';
const manageAgentsRouter = express.Router();


manageAgentsRouter.post('/', authenticateToken, requireAdmin, createAgent);
manageAgentsRouter.get('/', authenticateToken, requireAdmin, getAgents);
manageAgentsRouter.delete('/:id', authenticateToken, requireAdmin, deleteAgent);

export default manageAgentsRouter;