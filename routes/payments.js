require('dotenv').config();

const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const Order = require('../models/Order'); // Import your Order model
const {
    createSubscriptionOrder,
    verifySubscriptionPayment,
    verifyPayment
  } = require('../controllers/paymentController');
// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET_KEY
});

// Create Razorpay order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body;
    
    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
      currency,
      receipt,
      payment_capture: 1, // 👈 Add this line for auto-capture
      notes
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
});

router.post('/verify', async (req, res) => {
    try {
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        orderData
      } = req.body;
      
      // Verify signature
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
        .update(body.toString())
        .digest('hex');
        
      const isAuthentic = expectedSignature === razorpay_signature;
      
      if (isAuthentic) {
        // Create order in database
        const newOrder = new Order({
          ...orderData,
          payment: {
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            signature: razorpay_signature,
            status: 'completed'
          }
        });
        
        const savedOrder = await newOrder.save();
        
        res.json({
          success: true,
          message: 'Payment verified successfully',
          order: savedOrder
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Payment verification failed'
        });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({
        success: false,
        message: 'Error verifying payment',
        error: error.message
      });
    }
  });
  
  
  router.post('/create-subscription', createSubscriptionOrder);

  // Verify Razorpay payment and update user subscription
  router.post('/verify-subscription', verifySubscriptionPayment);

  
module.exports = router;