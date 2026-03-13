 
const mongoose = require('mongoose');

const paymentStatusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, 
    unique: true
  },
  description: {
    type: String,
    default: ''
  }
}, { versionKey: false });

module.exports = mongoose.model('paymentstatuses', paymentStatusSchema);
