const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const salesSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'clients', required: true },
    barber: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    paymentDetails: { // Referencia a los detalles de pago
        type: mongoose.Schema.Types.ObjectId,
        ref: 'paymentDetails',
        required: true
    }, 
    productsOrServices: [{
        item: {
            type: mongoose.Schema.Types.ObjectId, ref: 'productservices', required: true
        },
        price: { type: Number, required: true },
        discount: {
            type: mongoose.Schema.Types.ObjectId, 
            required: true,
            ref: 'discounts'
        }
    }],
    saleNumber: { type: Number, unique: true },
    dailyBarberSaleNumber: { type: Number,required: true, default: 0 },
    saleDate: {
        type: Date, default: () => {
            const date = new Date();
            return new Date(date.getTime() - (5 * 60 * 60 * 1000));
        }
    },
    observations: { type: String, maxlength: 500 }
}, {
    timestamps: true,
    versionKey: false,
});
salesSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('sales', salesSchema);