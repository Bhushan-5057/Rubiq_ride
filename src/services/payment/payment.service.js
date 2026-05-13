import crypto from "crypto";
import Razorpay from "razorpay";
import { Ride } from "../../models/ride/ride.model.js";

const isRazorpayConfigured = () => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
};

const getRazorpayClient = () => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
};

const toPaise = (amount) => Math.round(Number(amount || 0) * 100);

const createLocalPaymentOrder = (amount, currency, notes) => {
  const amountInPaise = toPaise(amount);
  const rideId = notes.rideId || "manual";

  return {
    success: true,
    provider: "razorpay",
    isMock: true,
    orderId: `local_order_${rideId}_${Date.now()}`.slice(0, 40),
    amount: amountInPaise / 100,
    amountInPaise,
    currency,
    status: "created",
    keyId: null,
  };
};

export const createPaymentOrder = async (
  amount,
  currency = "INR",
  notes = {}
) => {
  try {
    if (!amount || Number(amount) <= 0) {
      throw new Error("Valid payment amount is required");
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      console.warn(
        "Razorpay keys are missing. Using a local mock payment order."
      );
      return createLocalPaymentOrder(amount, currency, notes);
    }

    const order = await razorpay.orders.create({
      amount: toPaise(amount),
      currency,
      receipt: notes.rideId ? `ride_${notes.rideId}`.slice(0, 40) : undefined,
      notes,
    });

    return {
      success: true,
      provider: "razorpay",
      orderId: order.id,
      amount: order.amount / 100,
      amountInPaise: order.amount,
      currency: order.currency,
      status: order.status,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return {
      success: false,
      error: error.message,
      code: error.code || "razorpay_order_error",
    };
  }
};

export const verifyPaymentSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  if (!isRazorpayConfigured()) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature.length !== razorpaySignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(razorpaySignature)
  );
};

export const verifyPayment = async ({
  rideId,
  passengerId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  try {
    const isValidSignature = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSignature) {
      return {
        success: false,
        error: "Invalid payment signature",
        code: "invalid_payment_signature",
      };
    }

    const rideQuery = { _id: rideId };
    if (passengerId) rideQuery.passenger = passengerId;

    const ride = await Ride.findOne(rideQuery);
    if (!ride) {
      return {
        success: false,
        error: "Ride not found",
        code: "ride_not_found",
      };
    }

    if (ride.razorpayOrderId && ride.razorpayOrderId !== razorpayOrderId) {
      return {
        success: false,
        error: "Payment order does not match this ride",
        code: "order_mismatch",
      };
    }

    ride.paymentProvider = "razorpay";
    ride.paymentOrderId = razorpayOrderId;
    ride.razorpayOrderId = razorpayOrderId;
    ride.razorpayPaymentId = razorpayPaymentId;
    ride.razorpaySignature = razorpaySignature;
    ride.paymentStatus = "paid";
    ride.transactionDate = new Date();
    await ride.save();

    return {
      success: true,
      ride,
      paymentStatus: ride.paymentStatus,
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
    };
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    return {
      success: false,
      error: error.message,
      code: error.code || "payment_verification_error",
    };
  }
};

export const refundPayment = async (
  razorpayPaymentId,
  amount = null,
  notes = {}
) => {
  try {
    if (!razorpayPaymentId) {
      return {
        success: false,
        error: "Razorpay payment ID is required for refund",
        code: "payment_id_required",
      };
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      console.warn("Razorpay keys are missing. Skipping refund API call.");
      return {
        success: true,
        isMock: true,
        refundId: `local_refund_${Date.now()}`,
        status: "processed",
        amount,
        currency: "INR",
      };
    }

    const refundPayload = {
      notes,
    };

    if (amount) {
      refundPayload.amount = toPaise(amount);
    }

    const refund = await razorpay.payments.refund(
      razorpayPaymentId,
      refundPayload
    );

    return {
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
      currency: refund.currency,
    };
  } catch (error) {
    console.error("Error processing Razorpay refund:", error);
    return {
      success: false,
      error: error.message,
      code: error.code || "refund_error",
    };
  }
};
