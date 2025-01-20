const mongoose = require('mongoose');

const haircutcountersSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'clients',
    required: true, // Cliente específico
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'productservices',
    required: true, // Servicio específico
  },
  counter: {
    type: Number,
    default: 0, // Número de cortes realizados
    required: true,
  },
  lastRedeemed: {
    type: Date, // Fecha del último corte gratuito redimido
  },
}, {
  timestamps: true,
  versionKey: false,
});

module.exports = mongoose.model('haircutcounters', haircutcountersSchema);
