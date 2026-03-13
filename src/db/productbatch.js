const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const productBatchSchema = new mongoose.Schema({
    productServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'productservices',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    lotNumber: {
        type: String,
        trim: true, 
    },
    expiryDate: {
        type: Date
    },
    receivedDate: {
        type: Date,
        default: Date.now
    }, 
}, {
    timestamps: true,
    versionKey: false
});
productBatchSchema.plugin(mongoosePaginate);
productBatchSchema.pre('save', async function (next) {
    if (this.lotNumber) return next(); // Si ya viene definido, no lo sobreescribimos

    try {
        const lastBatch = await mongoose.model('productbatches').find({ productServiceId: this.productServiceId })
            .sort({ createdAt: -1 })
            .limit(1);

        let nextNumber = 1;

        if (lastBatch.length > 0 && lastBatch[0].lotNumber) {
            const match = lastBatch[0].lotNumber.match(/L(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }

        this.lotNumber = `L${String(nextNumber).padStart(4, '0')}`; // L001, L002, etc.
        next();
    } catch (err) {
        next(err);
    }
});
module.exports = mongoose.model('productbatches', productBatchSchema);