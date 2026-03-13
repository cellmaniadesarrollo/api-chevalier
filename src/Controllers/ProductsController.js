const ProductsController = {};
const ProductsModels = require('../models/ProductsModels');
const users = require("../models/UsersModels")

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
ProductsController.getnewdata = async (req, res) => {
  try {
    const data = await ProductsModels.getnewdata();
    res.json(data)
  } catch (error) {
    res.status(500)
  }
}
ProductsController.save = async (req, res) => {
  try {
    await ProductsModels.save(req.body, req.user._id)
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500)
  }
}
ProductsController.list = async (req, res) => {
  try {
    const [items, types] = await Promise.all([
      ProductsModels.list(req.body),
      ProductsModels.type()
    ]);

    res.json({ items, types });
  } catch (error) {
    res.sendStatus(500)
  }
}
ProductsController.getNewDataInsert = async (req, res) => {
  try {
    const [voucherTypes, payStatus] = await Promise.all([
      ProductsModels.getVoucherTypes(),
      ProductsModels.payStatus()
    ]);
    res.json({ voucherTypes, payStatus });
  } catch (error) {
    console.error('Error al obtener nuevos datos de ingresos:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener nuevos datos de ingresos.' });
  }
}

ProductsController.findSuppliers = async (req, res) => {
  try {
    const suppliers = await ProductsModels.findSuppliers(req.body.find);
    res.json(suppliers);
  } catch (error) {
    console.error('Error al obtener nuevos datos de ingresos:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener nuevos datos de ingresos.' });
  }
}
ProductsController.findProducts = async (req, res) => {
  try {
    const products = await ProductsModels.findProducts(req.body.find); 
    res.json(products);
  } catch (error) {
    console.error('Error al obtener nuevos datos de ingresos:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener nuevos datos de ingresos.' });
  }
}
ProductsController.saveProductsincome = async (req, res) => {
  try {
    const data = await ProductsModels.saveProductsincome(req.body, req.user._id);
    if (req.body.printOption) {
      const datas = await ProductsModels.getsaveProductsincome(data);
      res.json({ printData: datas });
    } else {
      res.sendStatus(200);
    }


  } catch (error) {
    console.error('Error al guardar el ingreso de productos:', error);
    res.status(500).json({ message: 'Error interno del servidor al guardar el ingreso de productos.' });
  }
}


ProductsController.printDocumentincome = async (req, res) => {
  try {
    const data = await ProductsModels.printDocumentincome(req.body, req.user._id); 
    res.json(data)
  } catch (error) {
    console.error('Error al guardar el ingreso de productos:', error);
    res.status(500).json({ message: 'Error interno del servidor al guardar el ingreso de productos.' });
  }
}
ProductsController.getItemPrintTicket = async (req, res) => {
  try {

    const datas = await ProductsModels.getsaveProductsincome(req.body);
    res.json(datas);
  } catch (error) {
    console.error('Error al guardar el ingreso de productos:', error);
    res.status(500).json({ message: 'Error interno del servidor al guardar el ingreso de productos.' });
  }
}
ProductsController.listProductsincome = async (req, res) => {
  try {
    const data = await ProductsModels.listProductsincome(req.body);

    res.json(data);
  } catch (error) {
    console.error('Error al guardar el ingreso de productos:', error);
    res.status(500).json({ message: 'Error interno del servidor al guardar el ingreso de productos.' });
  }
}
ProductsController.findProductBanches = async (req, res) => {
  try {
    const [batches, hairdresser] = await Promise.all([
      ProductsModels.findProductBanches(req.body),
      users.gethairdresser({roles:['HAIRDRESSER','MANAGER']})
    ]); 
    res.json({ batches, hairdresser });
  } catch (error) {
    console.error('Error al guardar el ingreso de productos:', error);
    res.status(500).json({ message: 'Error interno del servidor al guardar el ingreso de productos.' });
  }
}

ProductsController.saveBarberSuppliesTracker = async (req, res) => {
  try {
    await ProductsModels.saveBarberSuppliesTracker(req.body,req.user._id)
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500)
  }
}
ProductsController.listBarberSuppliesTracker = async (req, res) => {
  try {
  const [items, hairdresser]=   await Promise.all([ProductsModels.listBarberSuppliesTracker(req.body),  users.gethairdresser()])
    res.json({items, hairdresser})
  } catch (error) {
    res.sendStatus(500)
  }
}


ProductsController.expiredProducts = async (req, res) => {
  try {
    const  items = await ProductsModels.expiredProducts()
     
    res.json( items );
  } catch (error) {
    res.sendStatus(500)
  }
}
module.exports = ProductsController;
