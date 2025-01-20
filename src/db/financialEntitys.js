const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
// Definir el esquema de la entidad financiera
const financialEntitysSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  }, 
}, {
  timestamps: true,
  versionKey: false,
});

// Añadir el plugin de paginación
financialEntitysSchema.plugin(mongoosePaginate);

// Exportar el modelo
module.exports = mongoose.model('financialEntitys', financialEntitysSchema);