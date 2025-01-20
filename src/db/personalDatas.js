const mongoose = require('mongoose');

// Definir el esquema de datos personales
const personalDatasSchema = new mongoose.Schema({
  dni: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\d{8,}$/, 'La cédula debe contener al menos 8 dígitos'],
  },
  firstnames: {
    type: String,
    required: true,
    trim: true,
    uppercase: true, 
  },
  firstnames1: {
    type: String,
    trim: true,
    uppercase: true,
  },
  lastnames: {
    type: String,
    required: true, 
    trim: true,
    uppercase: true,
  },
  lastnames1: {
    type: String,
    trim: true,
    uppercase: true,
  },
  date_of_admission: {
    type: Date,
    required: true, 
  },
  dateOfBirth: {
    type: Date,
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\d{7,10}$/, 'El teléfono debe contener entre 7 y 10 dígitos'],
  }
}, { 
  timestamps: true,
  versionKey: false 
});

// Exportar el modelo de datos personales
module.exports = mongoose.model('personalDatas', personalDatasSchema);
