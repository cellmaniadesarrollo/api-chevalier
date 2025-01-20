const ClientsController = {};
const ClientsModels = require('../models/ClientsModels');

ClientsController.save = async (req, res) => {
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

ClientsController.find = async (req, res) => {
  try {
    // Verifica si 'find' está presente en el cuerpo de la solicitud
    if (!req.body.find || typeof req.body.find !== 'string') {
      return res.status(400).json({ message: 'La búsqueda debe ser una cadena válida.' });
    }

    // Llama al modelo para encontrar los clientes
    const clientes = await ClientsModels.find(req.body.find);

    // Si no se encuentran clientes, devolvemos un 404 con un mensaje de "No se encontraron coincidencias"
    if (!clientes || clientes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron coincidencias.' });
    }

    // Si todo va bien, devuelve los resultados
    res.status(200).json(clientes);
  } catch (error) {
    console.error('Error en la búsqueda de clientes:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
module.exports = ClientsController;
