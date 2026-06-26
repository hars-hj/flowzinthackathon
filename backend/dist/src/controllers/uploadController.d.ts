import express from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
declare function uploadFile(req: express.Request, res: express.Response): Promise<express.Response<any, Record<string, any>>>;
declare function listFiles(req: AuthenticatedRequest, res: express.Response): Promise<express.Response<any, Record<string, any>>>;
export { uploadFile, listFiles };
