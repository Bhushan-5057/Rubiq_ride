import express from "express";
import { sendTestNotification } from "../../controllers/notification/notificationController.js";

const router = express.Router();

//--------------------- Notification Send Route ---------------------
router.post("/send-test", sendTestNotification);

export default router;
