const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

// Definir el esquema de usuario
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String, 
  },
  password: {
    type: String,
    required: true,
  },
  roles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'roles', // Referencia a la colección de roles
      required: true,
    }
  ],
  available: {
    type: Boolean,
    default: true,
},
  personalData: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'personaldatas', // Referencia al esquema de datos personales
    required: true,
  },
  sessionId: {
    type: String, // Campo para almacenar el identificador único de la sesión
    default: null,
  }
}, { 
  timestamps: true,
  versionKey: false 
});

// Agregar el plugin de paginación al esquema de usuario
userSchema.plugin(mongoosePaginate);

// Exportar el modelo de usuario
module.exports = mongoose.model('users', userSchema);