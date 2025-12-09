import { Router } from "express";
import { confirmPaymentIntent, createPaymentIntent,handleStripeWebhook } from "../../controllers/payment/payment.controller.js";
import { authenticatePassenger } from "../../middleware/auth.middleware.js";

const router = Router();

//------------------------  Create Payment ------------------------
router.post("/create-payment", authenticatePassenger, createPaymentIntent);

//-------------------- Confirm Payment--------------------
router.post("/confirm-payment/:paymentIntentId", authenticatePassenger, confirmPaymentIntent);

//------------------ Webhook ------------------
router.post("/webhook", handleStripeWebhook);

export default router;
