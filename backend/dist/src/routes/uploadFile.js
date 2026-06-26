import express from "express";
import multer from "multer";
import { uploadFile, listFiles } from "../controllers/uploadController.js";
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';
const uploadRouter = express.Router();
// Store file in memory
const upload = multer({
    storage: multer.memoryStorage(),
});
uploadRouter.get("/", authenticateToken, requireAdmin, listFiles);
uploadRouter.post("/", authenticateToken, requireAdmin, upload.single("file"), uploadFile);
export default uploadRouter;
