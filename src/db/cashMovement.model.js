const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const cashMovementSchema = new mongoose.Schema({
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'cashsessions', required: true },

    type: {
        type: String,
        enum: ['income', 'expense'], // entrada / salida
        required: true
    },

    amount: { type: Number, required: true, min: 0 },

    description: { type: String, maxlength: 300, required: true },

    attachments: [{ type: String }], // URLs de comprobantes

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
}, {
    timestamps: true,
    versionKey: false,
});

cashMovementSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('cashmovements', cashMovementSchema);