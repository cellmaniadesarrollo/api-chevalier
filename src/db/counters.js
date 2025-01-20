const mongoose = require('mongoose');

const countersSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Nombre del contador, en este caso será "sales"
  seq: { type: Number, default: 0 }, // Último número generado
});

module.exports = mongoose.model('counters', countersSchema);