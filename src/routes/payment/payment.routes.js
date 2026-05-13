import { Router } from "express";
import {
  createPaymentOrder,
  refundPayment,
  verifyPayment,
} from "../../controllers/payment/payment.controller.js";
import { authenticatePassenger } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/create-order", authenticatePassenger, createPaymentOrder);
router.post("/verify", authenticatePassenger, verifyPayment);
router.post("/refund/:rideId", authenticatePassenger, refundPayment);

export default router;
