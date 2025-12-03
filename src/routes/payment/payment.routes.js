import { Router } from "express";
import { createRidePaymentOrder, verifyRidePayment } from "../../controllers/payment/payment.controller.js";
import { authenticatePassenger } from "../../middleware/auth.middleware.js";

const router = Router();

// Create a payment order for a ride
router.post('/create-order', authenticatePassenger, createRidePaymentOrder);

// Webhook for Razorpay to verify payment
router.post('/verify', verifyRidePayment);

export default router;
