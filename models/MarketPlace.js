const mongoose = require('mongoose');

const MarketPlaceSchema = new mongoose.Schema({
    title: { type: String },
    price: { type: Number},
    product_description: { type: String },
    complete_description: { type: String},
    category: { type: String },
    quantity: { type: Number },
    images: { type: [String] }, // Array to store image URLs
    weight: { type: String },
    brand: { type: String },
    color: { type: String },
    capacity: { type: String },
    total_power_outlets: { type: Number },
    amperage: { type: Number },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedBy: { type: String },
    likes: { type: Number, default: 0 },
    workflow_state: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('MarketPlace', MarketPlaceSchema); 