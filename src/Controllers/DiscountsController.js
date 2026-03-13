const DiscountsController = {};
const DiscountsModels = require('../models/DiscountsModels');

DiscountsController.save = async (req, res) => {
  try {

    // Llamar al modelo para realizar el login 
    const clientes = await ClientsModels.save(req.body, req.user._id);

    res.status(200).json(clientes);
  } catch (error) {
    console.log(error)
    // Capturar cualquier error lanzado por el modelo y responder con el código de error adecuado
    res.status(500).json({ success: false, message: error.message });
  }
}

DiscountsController.find = async (req, res) => {
  try { 

    // Llama al modelo para encontrar los clientes
    const descuentos = await DiscountsModels.find(req.body);
 
    res.status(200).json(descuentos);
  } catch (error) {
    console.error('Error en la búsqueda de clientes:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
DiscountsController.list = async (req, res) => {
  try {
    const clientes = await DiscountsModels.list(req.body);
    //console.log(clientes)
    res.status(200).json(clientes);
  } catch (error) {
    console.error('Error en la búsqueda de clientes:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
}
 DiscountsController.getNewData= async (req, res) => {
  try {
    const data = await DiscountsModels.getNewData();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error en la búsqueda de clientes:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

DiscountsController.editNewData= async (req, res) => {
  try {
    const data = await DiscountsModels.edit(req.body);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error en la búsqueda de clientes:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
}
DiscountsController.saveNewData= async (req, res) => {
  try {
    const data = await DiscountsModels.save(req.body);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error en la búsqueda de clientes:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
}
module.exports = DiscountsController;
