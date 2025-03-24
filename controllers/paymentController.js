// controllers/paymentController.js
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User'); // Adjust path as needed
const Order = require('../models/Order'); // Adjust path as needed

// Initialize Razorpay with your key credentials
const razorpay = new Razorpay({
  key_id: "rzp_test_CEcuqpm7JMLl6e",
  key_secret: "4EouTATC8SsWDJjigoHAfGpy"
});

// Create a new Razorpay order for subscription
exports.createSubscriptionOrder = async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body;
    const userId = req.user.id; // Assuming you have authentication middleware

    // Create order in Razorpay
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency || 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
      notes: {
        ...notes,
        userId: userId
      }
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount / 100, // Convert back to rupees for frontend
      message: 'Razorpay order created successfully'
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

// Verify Razorpay payment and update user subscription
exports.verifySubscriptionPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      plan,
      price
    } = req.body;
    
    const userId = req.user.id; // Assuming you have authentication middleware

    // Verify the payment signature
    const generatedSignature = crypto
      .createHmac('sha256',"4EouTATC8SsWDJjigoHAfGpy" )
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Check if the signature matches
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.'
      });
    }

    // Get payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Check if payment was successful
    if (payment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed. Please try again.'
      });
    }

    // Calculate subscription end date (1 month or 1 year from now)
    const now = new Date();
    const subscriptionEndDate = new Date(now);
    
    if (plan.toLowerCase().includes('monthly')) {
      subscriptionEndDate.setMonth(now.getMonth() + 1);
    } else {
      subscriptionEndDate.setFullYear(now.getFullYear() + 1);
    }

    // Update user subscription in database
    const user = await User.findByIdAndUpdate(
      userId,
      {
        subscription: {
          plan: plan,
          price: price,
          startDate: now,
          endDate: subscriptionEndDate,
          active: true,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id
        }
      },
      { new: true, runValidators: true }
    );

    // Create a record of the subscription payment
    const subscriptionRecord = {
      userId: userId,
      plan: plan,
      amount: price,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      paymentDate: now,
      expiryDate: subscriptionEndDate,
      status: 'completed'
    };

    // Save subscription record (you might want to create a Subscription model for this)
    // await Subscription.create(subscriptionRecord);

    res.status(200).json({
      success: true,
      message: `Payment successful! Your ${plan} plan is now active.`,
      subscription: user.subscription
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment verification',
      error: error.message
    });
  }
};

exports.verifyPayment = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto.createHmac('sha256', '4EouTATC8SsWDJjigoHAfGpy')
                                    .update(body.toString())
                                    .digest('hex');

  if (expectedSignature === razorpay_signature) {
      // Payment signature is valid
      return res.status(200).json({ message: "Payment verified successfully" });
  } else {
      return res.status(400).json({ message: "Payment verification failed" });
  }
};
