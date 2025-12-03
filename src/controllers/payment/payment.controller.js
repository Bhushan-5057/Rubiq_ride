import { createRazorpayOrder, verifyPayment } from '../../services/payment/payment.service.js';

// Create a Razorpay order for ride payment
export const createRidePaymentOrder = async (req, res) => {
  try {
    const { amount, rideId } = req.body;
    
    if (!amount || !rideId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and rideId are required'
      });
    }

    const orderResponse = await createRazorpayOrder(amount, 'INR', `ride_${rideId}`);
    
    if (!orderResponse.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment order',
        error: orderResponse.error
      });
    }

    res.status(200).json({
      success: true,
      order: orderResponse.order,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error in createRidePaymentOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Verify payment webhook
export const verifyRidePayment = async (req, res) => {
  try {
    const { order_id: orderId, payment_id: paymentId, razorpay_signature: signature } = req.body;
    
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details'
      });
    }

    const isSignatureValid = verifyPayment(orderId, paymentId, signature);
    
    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Update your database here to mark payment as successful
    // For example: await Ride.findByIdAndUpdate(rideId, { paymentStatus: 'completed' });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Error in verifyRidePayment:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};
