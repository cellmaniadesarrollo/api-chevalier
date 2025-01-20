const mongoose = require('mongoose');

const ticktockdatasSchema = new mongoose.Schema({
  video_id: {
    type: String,
    required: true,
    unique: true, 
  },
  title: {
    type: String, 
  },
  duration: {
    type: Number,  // Cambiado a tipo numérico
    required: true, 
  },
  create_time: {
    type: Number,  // Cambiado a tipo Unix timestamp (numérico)
    required: true
  },
  is_top: {
    type: String,
    required: true,
  },
  play_count:{
    type: Number,   
    required: true, 
  }
},
{timestamps:true});

const ticktockdatas = mongoose.model('ticktockdatas', ticktockdatasSchema);

module.exports = ticktockdatas;