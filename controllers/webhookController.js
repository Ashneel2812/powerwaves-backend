const crypto = require('crypto');
const User = require('../models/User'); // adjust path as needed
const Razorpay = require('razorpay');

exports.handleRazorpayWebhook = async (req, res) => {
  console.log('🔔 Webhook received:', {
    headers: req.headers,
    bodyLength: req.body ? req.body.length : 0
  });

  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    console.log('🔑 Webhook verification:', {
      hasSecret: !!secret,
      hasSignature: !!signature
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
      matches: expectedSignature === signature
    });

    if (expectedSignature !== signature) {
      console.error('❌ Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const event = JSON.parse(req.body);
    console.log('📦 Parsed webhook event:', {
      event: event.event,
      paymentId: event.payload?.payment?.entity?.id,
      orderId: event.payload?.payment?.entity?.order_id,
      paymentStatus: event.payload?.payment?.entity?.status,
      paymentMethod: event.payload?.payment?.entity?.method,
      amount: event.payload?.payment?.entity?.amount,
      currency: event.payload?.payment?.entity?.currency
    });

    const payment = event.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id;

    // Find user with that order ID
    const user = await User.findOne({ razorpayOrderId });
    console.log('👤 User lookup:', {
      found: !!user,
      orderId: razorpayOrderId,
      userId: user?._id
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
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status
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
        console.log('💳 Processing successful payment:', {
          orderId: razorpayOrderId,
          paymentMethod: payment.method,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status
        });

        const updates = {
          razorpayPaymentId: payment.id,
          paymentStatus: 'completed',
          planPurchaseTimestamp: new Date(),
          paymentMethod: payment.method
        };

        console.log('📝 User updates:', {
          userId: user._id,
          currentPlan: user.plan,
          currentLimit: user.productLimit
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
          status: payment.status
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
            description: payment.error_description
          }
        });

      default:
        console.log('ℹ️ Ignoring event:', event.event);
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
      body: req.body
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
