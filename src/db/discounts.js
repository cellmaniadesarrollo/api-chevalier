const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const discountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    uppercase: true,
  },
  description: {
    type: String,
    trim: true,
  },
  discountType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'discountTypes',  // Referencia a la colección de tipos de descuento
    required: true,
  },
  value: {
    type: Number,
    required: true,  // Valor del descuento (porcentaje o cantidad fija)
  },
  isGlobal: {
    type: Boolean,
    default: false,  // Si es un descuento global o personalizado por cliente
  },
  customers: [{
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'clients', // Referencia al cliente
      required: true,
    },
    freeCuts: {
      type: Number,
      default: 0, // Número de cortes gratuitos disponibles
    }}
  ],
  productsOrServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'productservices', // Referencia a los productos específicos (si no aplica a todos)
  }],
  validFrom: {
    type: Date,
    required: true,
  },
  validUntil: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
  versionKey: false
});

discountSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('discounts', discountSchema);