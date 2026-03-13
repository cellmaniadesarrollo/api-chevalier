const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const paymentSchema = new mongoose.Schema({
  voucher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'vouchers',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  paymentMethod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'paymentmethods', // Usando tu estructura existente
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  reference: String, // N° de operación bancaria, etc.
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  }
}, { timestamps: true, versionKey: false });

paymentSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('payments', paymentSchema);
