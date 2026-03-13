const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const productAssignmentSchema = new mongoose.Schema({
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'productbatches',
    required: true
  },
  barberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users', // Admin o supervisor que hizo la entrega
    required: true
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 200,
    default: null
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });
userSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('productassignments', productAssignmentSchema);
