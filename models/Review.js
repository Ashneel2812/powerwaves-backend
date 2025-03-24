// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: false,
    trim: true,
  },
  productId:{type:String,required:true}
});

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
