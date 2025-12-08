import { Router } from "express";
import { confirmPaymentIntent, createPaymentIntent,handleStripeWebhook } from "../../controllers/payment/payment.controller.js";
import { authenticatePassenger } from "../../middleware/auth.middleware.js";

const router = Router();

// Create a payment order for a ride
router.post("/create-payment", authenticatePassenger, createPaymentIntent);

router.post("/confirm-payment/:paymentIntentId", authenticatePassenger, confirmPaymentIntent);

router.post("/webhook", handleStripeWebhook);

export default router;
