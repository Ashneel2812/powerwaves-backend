const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            title: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
            subtotal: { type: Number, required: true }
        }
    ],
    billing: {
        firstName: { type: String, required: true }, // Keep firstName
        lastName: { type: String, required: true },  // Keep lastName
        email: { type: String, required: true },     // Keep email
        phone: {
          type: String,
          default: null,
          set: function (v) {
            // Remove all whitespace characters (spaces, tabs, etc.)
            return v ? v.replace(/\s+/g, '') : null;
          }
        },
        country: { type: String, required: true },   // Keep country
        state: { type: String, required: true },     // Keep state
        street: { type: String, required: true },    // Keep street
        pinCode: { type: String, required: true },   // Keep pinCode as zip
        town: { type: String, required: true },
        altphone: { type: String, required: true },
        landmark: { type: String, required: true },
    },
    orderSummary: {
        subtotal: { type: Number, required: true },
        shipping: { type: Number, required: true },
        total: { type: Number, required: true }
    },
    payment: {
        paymentId: String,
        orderId: String,
        signature: String,
        status: {
          type: String,
          enum: ['pending', 'completed', 'failed'],
          default: 'pending'
        }
      },
      status: {
        type: String,
        enum: ['processing', 'completed', 'cancelled'],
        default: 'processing'
      },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);