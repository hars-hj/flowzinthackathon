import { Router } from 'express';
import { register, registerAdmin, login, refreshToken, getMe } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/admin/register', registerAdmin);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me',authenticateToken, getMe);

export default router;