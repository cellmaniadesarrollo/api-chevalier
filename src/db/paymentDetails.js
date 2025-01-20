const mongoose = require('mongoose'); 


const paymentDetailsSchema = new mongoose.Schema({
    paymentMethod: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'paymentMethod',
        required: true
    },
    subtotal: { type: Number, required: true },
    total_discount: { type: Number, required: true },
    amount: { type: Number, required: true },

    bankEntity: { // Solo si la forma de pago es transferencia
        type: mongoose.Schema.Types.ObjectId,
        ref: 'financialEntity'
    },
    transferNumber: { type: String },  // Número de comprobante de la transferencia
}, {
    timestamps: true,
    versionKey: false,
});

module.exports = mongoose.model('paymentDetails', paymentDetailsSchema);