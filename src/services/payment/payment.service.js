import Stripe from 'stripe';
import { Ride } from '../../models/ride/ride.model.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentMethod=async (paymentMethodId)=>{
  try {
    return{
      success:true,
      paymentMethodId:paymentMethodId
    }
  } catch (error) {
    console.error("Error creating payment method : ",error)
    return{
      success:false,
      error:error.message
    }
  }
}

export const createPaymentIntent = async (amount, currency = 'inr', metadata = {}, customerId = null) => {
  try {
    const paymentIntentParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        ...metadata,
        integration_check: 'accept_a_payment',
      },
      payment_method_types: ['card'],
      capture_method: 'automatic',
      confirm: false,
    };

    if (customerId) {
      paymentIntentParams.customer = customerId;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      requiresAction: paymentIntent.status === 'requires_action',
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'payment_intent_error',
    };
  }
};

export const confirmPaymentIntent = async (paymentIntentId) => {
  try {
    // For testing, we'll use a test token that doesn't require 3D Secure
    // Create a test payment method using a test token
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: 'tok_visa' // Test token for a successful Visa card
      }
    });

    // Confirm the payment intent with the test payment method
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethod.id,
      // No need for return_url with test tokens
    });

    return {
      success: true,
      status: paymentIntent.status,
      requiresAction: paymentIntent.status === 'requires_action',
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'payment_confirmation_error',
    };
  }
};

export const retrievePaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        currency: paymentIntent.currency,
        created: paymentIntent.created,
        paymentMethod: paymentIntent.payment_method,
        requiresAction: paymentIntent.status === 'requires_action',
        lastPaymentError: paymentIntent.last_payment_error,
      },
    };
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'retrieve_payment_error',
    };
  }
};


export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    console.error("❌ Webhook signature verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  console.log(`🔔 Stripe Event Received: ${event.type}`);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;

        console.log("✅ PaymentIntent Success:", paymentIntent.id);

        const ride = await Ride.findOneAndUpdate(
          { paymentIntentId: paymentIntent.id },
          {
            paymentStatus: "paid",
            stripePaymentIntentId: paymentIntent.id,
            transactionDate: new Date(),
          },
          { new: true }
        );

        if (ride) {
          req.io.to(ride.passenger.toString()).emit("payment:success", {
            rideId: ride._id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
          });

          if (ride.driver) {
            req.io.to(ride.driver.toString()).emit("payment:received", {
              rideId: ride._id,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
            });
          }
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const failedPayment = event.data.object;
        console.log("❌ Payment Failed:", failedPayment.id);

        await Ride.findOneAndUpdate(
          { paymentIntentId: failedPayment.id },
          {
            paymentStatus: "failed",
            stripePaymentIntentId: failedPayment.id,
          }
        );

        const ride = await Ride.findOne({ paymentIntentId: failedPayment.id });

        if (ride) {
          req.io.to(ride.passenger.toString()).emit("payment:failed", {
            rideId: ride._id,
            error:
              failedPayment.last_payment_error?.message || "Payment failed",
          });
        }

        break;
      }

      case "charge.refunded":
        console.log("↩️ Charge refunded:", event.data.object.id);
        await Ride.updateOne(
          { stripeChargeId: event.data.object.id },
          { paymentStatus: "refunded" }
        );
        break;

      default:
        console.log(`⚠️ Unhandled Stripe event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("🔥 Webhook processing error:", error);
    res.status(500).send("Webhook handler failed");
  }
};
export const refundPayment = async (paymentIntentId, amount = null, reason = 'requested_by_customer') => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason,
    });

    // Update ride status if refund is successful
    if (refund.status === 'succeeded') {
      await Ride.findOneAndUpdate(
        { paymentIntentId },
        { paymentStatus: 'refunded' }
      );
    }

    return {
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
      currency: refund.currency,
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'refund_error',
    };
  }
};
