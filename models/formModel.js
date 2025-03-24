const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    rating:{type: String,required: true},
    name: { type: String, required: true },
    email: { type: String},
    message: { type: String },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', // Reference to the Product model
      required: true,
    }
  });

const Form = mongoose.model('Form', formSchema);
module.exports = Form;
