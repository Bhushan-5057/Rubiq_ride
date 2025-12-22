import express from "express";
import { saveFcmToken } from "../../controllers/notification/notification.controller.js";
const router = express.Router();

//--------------------- Notification Send Route ---------------------
router.post("/fcm-token", saveFcmToken);

export default router;