const Order = require('../models/Order');

exports.createOrder = async (req, res) => {
    const { userId, products, billing, orderSummary } = req.body;

    try {
        const newOrder = new Order({
            userId,
            products,
            billing,
            orderSummary
        });

        await newOrder.save();
        res.status(201).json({ success: true, message: 'Order created successfully', order: newOrder });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
    }
};