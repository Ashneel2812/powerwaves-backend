const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    shopName:String,
    email: { type: String, unique: true },
    phone: {
        type: String,
        default: null,
        set: function (v) {
          // Remove all whitespace characters (spaces, tabs, etc.)
          return v ? v.replace(/\s+/g, '') : null;
        }
      },
    realPassword: { type: String, default: null },
    password: String,
    address: String,
    buyerSeller: String,
    plan: { type: String, default: null },
    price: { type: Number, default: null },    
    paymentId: String,
    orderId: String,
    usedFree:{ type: String, default: "No" },
    productLimit: Number,
    razorpayOrderId:String,
    ifscCode: { type: String },
    accountNumber: { type: String},
    branch: { type: String },
    bankName: { type: String},
    gstNumber: { type: String},
    images: { type: [String], default: [] },
    googleMapLocation: { type: String },
    commission: { type: Number, default: 0 },
    totalPayment: { type: Number, default: 0 },
    planPurchaseTimestamp: {
        type: Date,
        default: Date.now, // Sets the default value to the current time
    },
    lastPaymentDate: { type: Date, default: null }, 
});
  
module.exports = mongoose.model('User', UserSchema);