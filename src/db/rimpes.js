const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const rimpesScheme = new mongoose.Schema(
  {
    name_rimpe: {
      type: String,
      uppercase: true,
      unique: true,
      required: true,
    },
  },
  
  { timestamps: true }
);
rimpesScheme.plugin(mongoosePaginate);
module.exports = mongoose.model("rimpes", rimpesScheme);
