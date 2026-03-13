const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const voucherSchema = new mongoose.Schema({
  serialNumber: {
    type: String,
    required: true, 
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'suppliers',
    required: true
  },
  voucherType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'vouchertypes', // Factura, Boleta, etc.
    required: true
  },
  issueDate: {
    type: Date,
    required: true
  },
  receiptDate: {
    type: Date,
    default: Date.now
  },
paymentStatus: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'paymentstatuses',
  required: true
},
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0
  },
  shippingCosttaxes: {
    type: Number,
    default: 0,
    min: 0
  },
  additionalCosts: {
    type: Number,
    default: 0,
    min: 0
  },

  total: {
    type: Number,
    required: true,
    min: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  }
}, { timestamps: true, versionKey: false });

voucherSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('vouchers', voucherSchema);