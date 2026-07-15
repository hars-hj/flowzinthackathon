import { Router } from 'express';
import {  registerAdmin, login, refreshToken, getMe } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { createAgent } from '../controllers/createAgent.js';
import { requireAdmin } from '../middleware/role.middleware.js';
const router = Router();

router.post('/admin/createAgent',authenticateToken, requireAdmin, createAgent);
router.post('/admin/register', registerAdmin);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me',authenticateToken, getMe);

export default router;