import { Router } from 'express';
import { register, registerAdmin, login, refreshToken } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/admin/register', registerAdmin);
router.post('/login', login);
router.post('/refresh', refreshToken);

export default router;