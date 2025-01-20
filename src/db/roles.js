const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    uppercase: true,
    unique: true,
  }
},
{timestamps:true});

module.exports = mongoose.model('roles', roleSchema);