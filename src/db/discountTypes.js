const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const discountTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, 
    trim: true,
    uppercase: true,
  },
  description: {
    type: String,
    trim: true,
  }
}, {
  timestamps: true,
  versionKey: false
});

discountTypeSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('discountTypes', discountTypeSchema);
