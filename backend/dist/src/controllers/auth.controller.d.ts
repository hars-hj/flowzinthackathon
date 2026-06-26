import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
export declare function register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function registerAdmin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getMe(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function refreshToken(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
