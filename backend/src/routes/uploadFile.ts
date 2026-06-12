import express from "express";
import multer from "multer";
import { uploadFile } from "../controllers/uploadController.js";

const uploadRouter = express.Router();

// Store file in memory
const upload = multer({
    storage: multer.memoryStorage(),
});

uploadRouter.post(
    "/",
    upload.single("file"),
    uploadFile
);

export default uploadRouter;