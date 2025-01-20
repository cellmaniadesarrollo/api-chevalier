const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const clientsSchema = new mongoose.Schema({
  dni: {
    type: String,
    required: true,
     unique: true,
    trim: true,
    match: [/^\d{8,}$/, 'La cédula debe contener al menos 8 dígitos'],
  },
  names: {
    type: String,
    trim: true,
    uppercase: true,
    required: true,
  },
  lastNames: {
    type: String,
    trim: true,
    uppercase: true,
    required: true,
  },
  address: {
    type: String,
    trim: true,
    uppercase: true,
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\d{7,10}$/, 'El teléfono debe contener entre 7 y 10 dígitos'],
  },
  email: {
    type: String,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Debe ser un correo electrónico válido'],
  },
  dateOfBirth: {
    type: Date,
  },
  edits: [{
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users', // Ref a la colección 'User'
      required: true,
    },
    editedAt: {
      type: Date,
      default: Date.now, // Fecha de la edición
    }
  }]
}, {
  timestamps: true,  // Esto agrega `createdAt` y `updatedAt`
  versionKey: false  // Desactiva el campo `__v`
});

// Agregamos la paginación al esquema
clientsSchema.plugin(mongoosePaginate);

const clients = mongoose.model('clients', clientsSchema);

module.exports = clients;