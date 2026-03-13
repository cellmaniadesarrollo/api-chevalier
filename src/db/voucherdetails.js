const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const voucherDetailSchema = new mongoose.Schema({
  voucher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'vouchers',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'productservices',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
    taxes: {
    type: Number,
    default: 0,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  batchNumber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'productbatches', // <- Referencia al modelo de lotes
    required: false // Puedes cambiar esto a true si siempre debe existir un lote
  },
}, { versionKey: false });
voucherDetailSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('voucherdetails', voucherDetailSchema);