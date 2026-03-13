const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  identification: {
    type: String, // RUC/NIT/CUIT/etc.
    required: true,
    unique: true
  },
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'countries'  
  },
  address: String,
  phone: String,
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
      rimpe: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'rimpes',
    },
  isActive: {
    type: Boolean,
    default: true
  },
  edits: [{
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    editedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true, versionKey: false });

supplierSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('suppliers', supplierSchema);