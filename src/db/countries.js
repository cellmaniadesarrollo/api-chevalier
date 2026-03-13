const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const countriesScheme = new mongoose.Schema(
  {
    name_countrie: {
      type: String,
      uppercase: true,
      unique: true,
      required: true,
    },
  },
  { timestamps: true }
);
countriesScheme.plugin(mongoosePaginate);
module.exports = mongoose.model("countries", countriesScheme);