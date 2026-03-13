require("dotenv").config();
const mongoose = require("mongoose");

const DB_URI = process.env.MONGO_URI; 

module.exports = () => {
  const connect = async () => {
    try {
      await mongoose.connect(DB_URI, {
        maxPoolSize: 50,
        wtimeoutMS: 2500,
      });
      console.log("✅ Conexión MongoDB correcta");
    } catch (err) {
      console.error("❌ Error de conexión MongoDB:", err);
      process.exit(1);
    }
  };
  connect();
};
