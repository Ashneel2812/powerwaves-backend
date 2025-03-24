const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    title: String,
    price: Number,
    productDescription: String,
    completeDescription: String,
    category: String,
    image: String,
    quantity: Number,
    weight: Number,
    brand: String,
    color: String,
    capacity: Number,
    totalPowerOutlets: Number,
    amperage: Number,
});

module.exports = mongoose.model('Product', ProductSchema);