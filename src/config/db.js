const mongoose = require("mongoose");

const DB_URI = `mongodb://127.0.0.1:27017/chevalier`; 
module.exports = () => {
  const connect = async () => {
    try {
        await mongoose.connect(DB_URI , {
            maxPoolSize: 50,
            wtimeoutMS: 2500,
           //  useNewUrlParser: true
        })
        console.log('Conexion Mongobd correcta ')
    } catch (err) {
        console.log(err)
        process.exit(1)
    }
  };
  connect();
};
