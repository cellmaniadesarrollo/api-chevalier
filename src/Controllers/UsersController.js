const UsersController = {};
const UsersModels = require('../models/UsersModels');
 
UsersController.login  = async (req, res) => {
  try {
    // const datausers=await UsersModels.saveMultipleUsersWithPersonalData()
    // console.log(datausers)


    // Llamar al modelo para realizar el login
    const data = await UsersModels.login(req.body); 
    // Responder con los datos si todo fue exitoso
    res.status(200).json(data);
  } catch (error) {
    console.log(error)
    // Capturar cualquier error lanzado por el modelo y responder con el código de error adecuado
    res.status(500).json({ success: false, message: error.message });
  }
}
module.exports = UsersController;
