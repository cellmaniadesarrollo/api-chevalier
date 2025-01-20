const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const paymentMethodsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
       trim: true,
       uppercase: true,
      } ,
      active: {
        type: Boolean,
        default: true
      }
}, {
  timestamps: true,  // Esto agrega `createdAt` y `updatedAt`
  versionKey: false  // Desactiva el campo `__v`
});
 
// Agregamos la paginación al esquema 
paymentMethodsSchema.plugin(mongoosePaginate);

const paymentMethods = mongoose.model('paymentMethods', paymentMethodsSchema);

module.exports = paymentMethods;