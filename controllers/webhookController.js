const crypto = require('crypto');
const User = require('../models/User'); // adjust path as needed
const Razorpay = require('razorpay');

exports.handleRazorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const payload = req.body;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');

  if (expectedSignature !== signature) {
    return res.status(400).send('Invalid signature');
  }

  const event = JSON.parse(req.body);

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const razorpayOrderId = payment.order_id;

    try {
      // Find user with that order ID
      const user = await User.findOne({ razorpayOrderId });

      if (user) {
        let productLimit;

        switch (user.plan) {
          case 'Basic':
            productLimit = user.productLimit + 30;
            break;
          case 'Popular':
            productLimit = user.productLimit + 50;
            break;
          case 'Business':
            productLimit = user.productLimit + 9999;
            break;
          default:
            return res.status(400).send('Invalid plan');
        }

        user.productLimit = productLimit;
        user.razorpayPaymentId = payment.id;
        user.planPurchaseTimestamp = new Date();
        await user.save();

        console.log(`✅ User plan updated via webhook for ${user.email}`);
      } else {
        console.warn(`❌ No user found with Razorpay order ID: ${razorpayOrderId}`);
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('Webhook processing error:', err);
      return res.status(500).send('Server error');
    }
  }

  res.status(200).json({ status: 'ignored' });
};
