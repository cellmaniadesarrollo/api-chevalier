const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const voucherTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }, 
  isActive: {
    type: Boolean,
    default: true
  }
}, { versionKey: false });

voucherTypeSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('vouchertypes', voucherTypeSchema);
