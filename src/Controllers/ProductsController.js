const ProductsController = {};
const ProductsModels = require('../models/ProductsModels');
 
ProductsController.find = async (req, res) => {
  try {
    // Verificar si 'find' está presente y es una cadena válida
    if (!req.body.find || typeof req.body.find !== 'string') {
      return res.status(400).json({ message: 'La búsqueda debe ser una cadena válida.' });
    }

    // Llamar al modelo para realizar la búsqueda
    const data = await ProductsModels.find({ name: req.body.find });

    // Si no se encuentran productos o servicios, devolver 404
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron productos o servicios con los criterios proporcionados.',
      });
    }

    // Responder con los datos si todo fue exitoso
    res.status(200).json(data);
  } catch (error) {
    console.error('Error en la búsqueda de productos o servicios:', error);

    // Manejar el error personalizado "Service type not found"
    if (error.message === 'Service type not found') {
      return res.status(404).json({ 
        message: 'Tipo de servicio no encontrado.',
      });
    }

    // Cualquier otro error no controlado
    res.status(500).json({ 
      message: 'Error interno del servidor: ' + error.message,
    });
  }
};
module.exports = ProductsController;
