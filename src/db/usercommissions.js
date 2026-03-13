const mongoose = require('mongoose');

const userCommissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'productservices',
        required: true
    },
    // Si es null → aplica a todos los valores de ese servicio y usuario
    servicePrice: {
        type: Number,
        default: null,
        min: [0, 'El valor del servicio no puede ser negativo']
    },
    rate: {
        type: Number,
        required: true,
        validate: {
            validator: v => v >= 0 && v <= 100,
            message: 'El porcentaje de comisión debe estar entre 0 y 100.'
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('usercommissions', userCommissionSchema);
