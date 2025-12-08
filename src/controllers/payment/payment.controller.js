import {
  createPaymentIntent as createPaymentIntentService,
  confirmPaymentIntent as confirmPaymentIntentService,
  retrievePaymentIntent as retrievePaymentIntentService,
  handleStripeWebhook as handleStripeWebhookService,
  refundPayment as refundPaymentService
} from '../../services/payment/payment.service.js';
import { Ride } from "../../models/ride/ride.model.js";

export const createPaymentIntent = async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ success: false, message: "Ride ID required" });
    }


    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    if (!ride.fareEstimate) {
      return res.status(400).json({ success: false, message: "fareEstimate missing in ride" });
    }

    const amountToCharge = Math.round(ride.fareEstimate * 100);

    const paymentResult = await createPaymentIntentService(
      ride.fareEstimate,
      'inr',
      { rideId: ride._id.toString() }
    );

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: paymentResult.error
      });
    }

    ride.paymentIntentId = paymentResult.paymentIntentId;
    ride.paymentStatus = "pending";
    await ride.save();

    return res.json({
      success: true,
      clientSecret: paymentResult.clientSecret,
      paymentIntentId: paymentResult.paymentIntentId,
      rideId: ride._id,
      amount: ride.fareEstimate,
    });

  } catch (error) {
    console.error("Error creating payment intent:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const confirmPaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const { paymentMethodId } = req.body

    // if (!paymentMethodId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Payment method ID is required"
    //   })
    // }
    const result = await confirmPaymentIntentService(paymentIntentId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    return res.json({
      success: true,
      status: result.status,
      clientSecret: result.clientSecret,
      requiresAction: result.requiresAction
    });
  } catch (error) {
    console.error("Error in confirm payment:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const retrievePaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const result = await retrievePaymentIntentService(paymentIntentId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    return res.json({
      success: true,
      paymentIntent: result.paymentIntent
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ---------- WEBHOOK HANDLER ----------
export const handleStripeWebhook = async (req, res) => {
  try {
    await handleStripeWebhookService(req, res);
  } catch (error) {
    console.error('Webhook processing error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
  }
};

export const refundPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const { amount, reason } = req.body;

    const result = await refundPaymentService(
      paymentIntentId,
      amount ? Math.round(amount * 100) : null,
      reason
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    return res.json({
      success: true,
      refundId: result.refundId,
      status: result.status,
      amount: result.amount,
      currency: result.currency
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
