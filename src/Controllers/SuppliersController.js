const SuppliersController = {}; 
const SuppliersModels = require('../models/SuppliersModels');

SuppliersController.getNewData = async (req, res) => {
  try { 
const [rimpes, countries] = await Promise.all([
    SuppliersModels.getRimpes(), 
     SuppliersModels.getCountries()
]); 
res.status(200).json({ rimpes, countries });
  } catch (error) {
    console.log(error)
    // Capturar cualquier error lanzado por el modelo y responder con el código de error adecuado
    res.status(500).json({ success: false, message: error.message });
  }
}
SuppliersController.findDniDupplierExist= async (req, res) => {
  try { 
const find= await SuppliersModels.findDniDupplierExist(req.body.id)  
res.status(200).json({ exists:find });
  } catch (error) {
    console.log(error)
    // Capturar cualquier error lanzado por el modelo y responder con el código de error adecuado
    res.status(500).json({ success: false, message: error.message });
  }
}
SuppliersController.saveSupplier= async (req, res) => {
  try { 
 await SuppliersModels.saveSupplier(req.body)  
res.sendStatus(200)
  } catch (error) {
    console.log(error)
    // Capturar cualquier error lanzado por el modelo y responder con el código de error adecuado
    res.status(500).json({ success: false, message: error.message });
  }
}
module.exports = SuppliersController;
