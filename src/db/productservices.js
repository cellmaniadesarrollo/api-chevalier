const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const productservicesSchema = new mongoose.Schema({
    cod: {
        type: String,
        required: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
    },
    isFixedPrice: {
        type: Boolean, 
        default: true
    },
    price: { type: Number, required: function() { return this.isFixedPrice; } },  
    prices: [{
            type: Number,
            required: true
        }],
    description: {
        type: String,
        required: false,
        trim: true,
    },
    commissionRate:{
        type: Number,
        required: true,
        default: 45,
        validate: {
            validator: function(v) {
              return v >= 0 && v <= 100;
            },
            message: 'El porcentaje de comisión debe estar entre 0 y 100.'
          }
    },

    stock: {
        type: Number,
        required: function () {
            return this.type === 'PRODUCT';  // Solo requerido si es un producto
        },
    },
    type: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'productservicestypes',  // Referencia al tipo de producto/servicio
        required: true,
    },
    available: {
        type: Boolean,
        default: true,
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
    timestamps: true,
    versionKey: false
});

productservicesSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('productservices', productservicesSchema);
