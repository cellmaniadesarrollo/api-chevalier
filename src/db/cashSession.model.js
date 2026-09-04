const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const cashSessionSchema = new mongoose.Schema({
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },

    // Apertura
    expectedOpeningAmount: { type: Number, required: true, default: 0 },
    declaredOpeningAmount: { type: Number, required: true },
    openingDifference: { type: Number, default: 0 },
    openingAlert: { type: Boolean, default: false },
    openingDate: { type: Date, default: Date.now },

    // Cierre
    expectedCashAmount: { type: Number, default: null },
    countedAmount: { type: Number, default: null },
    closingDifference: { type: Number, default: null },
    closingAlert: { type: Boolean, default: false },
    cashDelivered: { type: Number, default: null },
    cashLeftForNextDay: { type: Number, default: null },
    closingDate: { type: Date, default: null },

    notes: { type: String, maxlength: 500 },
}, {
    timestamps: true,
    versionKey: false,
});

cashSessionSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('cashsessions', cashSessionSchema);