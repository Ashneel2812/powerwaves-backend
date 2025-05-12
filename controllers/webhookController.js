const crypto = require('crypto');
const User = require('../models/User'); // adjust path as needed
const Razorpay = require('razorpay');

exports.handleRazorpayWebhook = async (req, res) => {
  console.log('🔔 Webhook received:', {
    headers: req.headers,
    bodyLength: req.body ? req.body.length : 0,
    timestamp: new Date().toISOString()
  });

  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    console.log('🔑 Webhook verification:', {
      hasSecret: !!secret,
      hasSignature: !!signature,
      secretLength: secret ? secret.length : 0
    });

    if (!secret || !signature) {
      console.error('❌ Missing webhook secret or signature');
      return res.status(400).json({
        success: false,
        message: 'Missing webhook secret or signature'
      });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.body)
      .digest('hex');

    console.log('🔐 Signature verification:', {
      expected: expectedSignature,
      received: signature,
      matches: expectedSignature === signature,
      bodyPreview: req.body ? req.body.substring(0, 50) + '...' : 'empty'
    });

    if (expectedSignature !== signature) {
      console.error('❌ Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const event = JSON.parse(req.body);
    console.log('📦 Raw webhook event:', JSON.stringify(event, null, 2));
    
    console.log('📊 Parsed webhook event:', {
      event: event.event,
      eventId: event.payload?.payment?.entity?.id || 'unknown',
      paymentId: event.payload?.payment?.entity?.id,
      orderId: event.payload?.payment?.entity?.order_id,
      paymentStatus: event.payload?.payment?.entity?.status,
      paymentMethod: event.payload?.payment?.entity?.method,
      amount: event.payload?.payment?.entity?.amount,
      currency: event.payload?.payment?.entity?.currency,
      notes: event.payload?.payment?.entity?.notes || {},
      description: event.payload?.payment?.entity?.description || 'No description'
    });

    const payment = event.payload?.payment?.entity;
    if (!payment) {
      console.error('❌ Invalid payment payload structure');
      return res.status(400).json({
        success: false,
        message: 'Invalid payment payload structure'
      });
    }
    
    const razorpayOrderId = payment?.order_id;
    console.log('🔍 Looking up user with orderId:', razorpayOrderId);

    // Find user with that order ID
    const user = await User.findOne({ razorpayOrderId });
    console.log('👤 User lookup:', {
      found: !!user,
      orderId: razorpayOrderId,
      userId: user?._id,
      email: user?.email,
      currentPlan: user?.plan
    });

    if (!user) {
      console.warn('⚠️ No user found with Razorpay order ID:', razorpayOrderId);
      return res.status(404).json({
        success: false,
        message: 'User not found for this order'
      });
    }

    // Handle different payment events
    switch (event.event) {
      case 'payment.attempted':
        console.log('🔄 Processing payment attempt:', {
          orderId: razorpayOrderId,
          paymentMethod: payment.method,
          amount: payment.amount / 100, // Convert to actual currency
          currency: payment.currency,
          status: payment.status,
          vpa: payment.vpa || 'N/A', // For UPI payments
          card: payment.card ? `${payment.card.network} ****${payment.card.last4}` : 'N/A'
        });

        // Update user's payment status to attempted
        const attemptUpdates = {
          paymentStatus: 'attempted',
          paymentAttempt: {
            timestamp: new Date(),
            method: payment.method,
            status: payment.status
          }
        };

        const attemptedUser = await User.findByIdAndUpdate(
          user._id,
          { $set: attemptUpdates },
          { new: true, runValidators: true }
        );

        console.log('⏳ Payment attempt recorded:', {
          userId: attemptedUser._id,
          email: attemptedUser.email,
          status: payment.status
        });

        return res.status(200).json({
          success: true,
          message: 'Payment attempt recorded',
          status: payment.status
        });

      case 'payment.captured':
      case 'payment.authorized': // Also handle authorized payments
        console.log('💳 Processing successful payment:', {
          orderId: razorpayOrderId,
          paymentMethod: payment.method,
          amount: payment.amount / 100, // Convert to actual currency
          currency: payment.currency,
          status: payment.status,
          event: event.event
        });

        // Determine the actual payment status based on the event
        const actualPaymentStatus = event.event === 'payment.captured' ? 'completed' : 'authorized';
        
        const updates = {
          razorpayPaymentId: payment.id,
          paymentStatus: actualPaymentStatus,
          planPurchaseTimestamp: new Date(),
          paymentMethod: payment.method
        };

        console.log('📝 User updates:', {
          userId: user._id,
          currentPlan: user.plan,
          currentLimit: user.productLimit,
          newPaymentStatus: actualPaymentStatus
        });

        // Calculate product limit based on plan
        switch (user.plan) {
          case 'Basic':
            updates.productLimit = user.productLimit + 30;
            break;
          case 'Popular':
            updates.productLimit = user.productLimit + 50;
            break;
          case 'Business':
            updates.productLimit = user.productLimit + 9999;
            break;
          default:
            console.error('❌ Invalid plan type:', user.plan);
            return res.status(400).json({
              success: false,
              message: 'Invalid plan type'
            });
        }

        console.log('📊 Plan updates:', {
          newLimit: updates.productLimit,
          plan: user.plan
        });

        // Update user document
        const updatedUser = await User.findByIdAndUpdate(
          user._id,
          { $set: updates },
          { new: true, runValidators: true }
        );

        console.log('✅ User updated successfully:', {
          userId: updatedUser._id,
          email: updatedUser.email,
          newLimit: updatedUser.productLimit,
          paymentStatus: updatedUser.paymentStatus
        });
        
        return res.status(200).json({
          success: true,
          message: 'Payment processed successfully',
          user: {
            email: updatedUser.email,
            plan: updatedUser.plan,
            productLimit: updatedUser.productLimit
          }
        });

      case 'payment.failed':
        console.log('❌ Processing failed payment:', {
          orderId: razorpayOrderId,
          errorCode: payment.error_code,
          errorDescription: payment.error_description,
          status: payment.status,
          method: payment.method,
          amount: payment.amount / 100,
          currency: payment.currency,
          contactDetails: payment.contact || 'Not provided',
          email: payment.email || 'Not provided'
        });

        // Add more detailed error logging based on error code
        console.log('🔍 Detailed error analysis:', {
          errorCode: payment.error_code,
          description: payment.error_description,
          possibleSolution: getDomainVerificationSolution(payment.error_code)
        });

        // Update user's payment status to failed
        const failedUpdates = {
          paymentStatus: 'failed',
          paymentError: {
            code: payment.error_code,
            description: payment.error_description,
            timestamp: new Date()
          }
        };

        const failedUser = await User.findByIdAndUpdate(
          user._id,
          { $set: failedUpdates },
          { new: true, runValidators: true }
        );

        console.log('⚠️ User payment status updated to failed:', {
          userId: failedUser._id,
          email: failedUser.email,
          errorCode: payment.error_code
        });

        return res.status(200).json({
          success: true,
          message: 'Payment failure recorded',
          error: {
            code: payment.error_code,
            description: payment.error_description,
            solution: getDomainVerificationSolution(payment.error_code)
          }
        });

      default:
        console.log('ℹ️ Unhandled event type:', {
          event: event.event,
          entityId: payment.id,
          orderId: razorpayOrderId
        });
        return res.status(200).json({
          success: true,
          message: 'Webhook received but no action taken',
          event: event.event
        });
    }

  } catch (error) {
    console.error('❌ Webhook processing error:', {
      message: error.message,
      stack: error.stack,
      bodyPreview: req.body
      ? JSON.stringify(req.body).substring(0, 100) + '...' : 'empty'    
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper function to provide solutions for common error codes
function getDomainVerificationSolution(errorCode) {
  switch(errorCode) {
    case 'BAD_REQUEST_ERROR':
      return 'This appears to be a domain verification issue. Make sure your domain is verified in the Razorpay Dashboard. Go to Settings > Website & App Settings and verify that "photobazaar.in" is added and verified.';
    case 'GATEWAY_ERROR':
      return 'There was an issue with the payment gateway. The customer should try again or use a different payment method.';
    case 'PAYMENT_FAILED':
      return 'The payment failed. This could be due to insufficient funds or a temporary issue with the payment method. Ask the customer to try again or use a different payment method.';
    default:
      return 'Check the Razorpay dashboard for more information about this error.';
  }
}