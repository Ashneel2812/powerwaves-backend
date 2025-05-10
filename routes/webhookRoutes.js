const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User'); // adjust as per your project

router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const receivedSignature = req.headers['x-razorpay-signature'];
    const payload = req.body.toString();

    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

    if (expectedSignature !== receivedSignature) {
        return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event = JSON.parse(payload);

    if (event.event === 'payment.captured') {
        const payment = event.payload.payment.entity;

        const razorpay_order_id = payment.order_id;

        // Find user by saved order ID
        const user = await User.findOne({ razorpayOrderId: razorpay_order_id });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found for this order" });
        }

        // Update user plan (assumes plan info already saved before)
        const plan = user.plan;
        const price = user.price;

        let productLimit;
        if (plan === 'Basic') {
            productLimit = user.productLimit + 50;
        } else if (plan === 'Popular') {
            productLimit = user.productLimit + 150;
        } else if (plan === 'Business') {
            productLimit = user.productLimit + 9999;
        }

        user.plan = plan;
        user.price = price;
        user.planPurchaseTimestamp = new Date();
        user.productLimit = productLimit;
        user.razorpayPaymentId = payment.id;
        await user.save();

        return res.status(200).json({ success: true, message: "User plan updated via webhook" });
    }

    return res.status(200).json({ success: true, message: "Webhook received but not processed" });
});

module.exports = router;
