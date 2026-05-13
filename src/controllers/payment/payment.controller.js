import {
  createPaymentOrder as createPaymentOrderService,
  refundPayment as refundPaymentService,
  verifyPayment as verifyPaymentService,
} from "../../services/payment/payment.service.js";
import { Ride } from "../../models/ride/ride.model.js";

export const createPaymentOrder = async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ success: false, message: "Ride ID required" });
    }

    const ride = await Ride.findOne({ _id: rideId, passenger: req.passenger._id });

    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    if (!ride.fareEstimate) {
      return res.status(400).json({ success: false, message: "fareEstimate missing in ride" });
    }

    const paymentResult = await createPaymentOrderService(
      ride.fareEstimate,
      "INR",
      {
        rideId: ride._id.toString(),
        passengerId: req.passenger._id.toString(),
        type: "ride_payment",
      }
    );

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: paymentResult.error,
      });
    }

    ride.paymentProvider = "razorpay";
    ride.paymentOrderId = paymentResult.orderId;
    ride.razorpayOrderId = paymentResult.orderId;
    ride.paymentStatus = "pending";
    await ride.save();

    return res.json({
      success: true,
      provider: "razorpay",
      keyId: paymentResult.keyId,
      orderId: paymentResult.orderId,
      rideId: ride._id,
      amount: paymentResult.amount,
      amountInPaise: paymentResult.amountInPaise,
      currency: paymentResult.currency,
      paymentStatus: ride.paymentStatus,
    });
  } catch (error) {
    console.error("Error creating payment order:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      rideId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!rideId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "rideId, razorpayOrderId, razorpayPaymentId, and razorpaySignature are required",
      });
    }

    const result = await verifyPaymentService({
      rideId,
      passengerId: req.passenger._id,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    req.io?.to(result.ride.passenger.toString()).emit("payment:success", {
      rideId: result.ride._id,
      amount: result.ride.fareEstimate,
      currency: "INR",
    });

    if (result.ride.driver) {
      req.io?.to(result.ride.driver.toString()).emit("payment:received", {
        rideId: result.ride._id,
        amount: result.ride.fareEstimate,
        currency: "INR",
      });
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
      paymentStatus: result.paymentStatus,
      paymentId: result.paymentId,
      orderId: result.orderId,
      ride: result.ride,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const refundPayment = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { amount, reason } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    const result = await refundPaymentService(
      ride.razorpayPaymentId,
      amount || null,
      {
        rideId: ride._id.toString(),
        reason: reason || "requested_by_customer",
      }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    ride.paymentStatus = "refunded";
    await ride.save();

    return res.json({
      success: true,
      refundId: result.refundId,
      status: result.status,
      amount: result.amount,
      currency: result.currency,
      ride,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
