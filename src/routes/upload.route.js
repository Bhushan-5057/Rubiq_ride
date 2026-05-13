import { Router } from "express";
import { uploadSingleImage } from "../middleware/upload.middleware.js";
import { authenticateUser } from "../middleware/auth.middleware.js";
import { uploadImageController } from "../controllers/upload.controller.js";

const router = Router();

// POST /api/upload/image
router.post("/image", authenticateUser, uploadSingleImage, uploadImageController);

export default router;
