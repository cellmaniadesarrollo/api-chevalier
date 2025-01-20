const mongoose = require('mongoose');

const productservicestypesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  } 
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('productservicestypes', productservicestypesSchema);