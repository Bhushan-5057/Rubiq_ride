import express from "express";
import { saveFcmToken } from "../../controllers/notification/notification.controller.js";
import {protect} from "../../middleware/auth.middleware.js";
const router = express.Router();

//--------------------- Notification Send Route ---------------------
router.post("/fcm-token", protect, saveFcmToken);
export default router;