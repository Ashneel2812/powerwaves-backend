const mongoose = require('mongoose');

const PricingSchema = new mongoose.Schema({
    plan: {
        type: String,
        enum: ['Basic', 'Popular', 'Business'],  // Ensures only these values are allowed
        required: true
    },
    monthlyPrice: {
        type: Number,
        required: true,
        min: 0  // Ensures price is a positive value
    },
    yearlyPrice: {
        type: Number,
        required: true,
        min: 0  // Ensures price is a positive value
    },
});

module.exports = mongoose.model('Pricing', PricingSchema);
