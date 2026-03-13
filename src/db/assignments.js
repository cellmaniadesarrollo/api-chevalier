const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const assignmentSchema = new mongoose.Schema({
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'productbatches', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    assigner: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },  
    quantity: { type: Number , required: true  },
    assignmentDate: {
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
assignmentSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('assignments', assignmentSchema);