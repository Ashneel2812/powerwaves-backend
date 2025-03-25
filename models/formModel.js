const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String},
    message: { type: String },
    phoneNumber:{ type: String }
  });

const Form = mongoose.model('Form', formSchema);
module.exports = Form;
