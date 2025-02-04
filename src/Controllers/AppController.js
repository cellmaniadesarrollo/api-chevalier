const mongoose = require('mongoose'); // Importa mongoose
const AppController = {};
const index = require('../models');
const Clientsdb = require('../db/clients'); // Asegúrate de que la ruta al modelo es correcta
const HaircutCounters = require('../db/haircutcounters'); // Importa el modelo haircutcounters
const Sales = require('../db/sales'); // Importa el modelo sales
const ProductServices = require('../db/productservices'); // Importa el modelo productservices
const Discounts = require('../db/discounts'); // Importa el modelo discounts
const SalesModels = require("../models/SalesModels"); // Importa el modelo SalesModels

AppController.index = async (req, res) => {
  res.sendFile(__dirname + "/views/");
  //res.send('exito aqui') 
};

AppController.ticktockupdate = async () => {
  try {
    await index.tictockupdate()

    // res.json(data) 
  } catch (error) {
    console.error('Error scraping TikTok:', error);
    // res.status(500).json({ success: false, error: error.message });
  }

}

AppController.ticktock = async (req, res) => {
  try {
    const data = await index.ticktock()

    res.json(data)
  } catch (error) {
    console.error('Error scraping TikTok:', error);
    res.status(500).json({ success: false, error: error.message });
  }

}
AppController.tdata = async (req, res) => {
  try {
    const data = await index.tdata()

    res.json(data)
  } catch (error) {
    console.error('Error scraping TikTok:', error);
    res.status(500).json({ success: false, error: error.message });
  }

}

AppController.facebook = async (req, res) => {
  try {
    const data = await index.facebook()

    res.json(data)
  } catch (error) {
    console.error('Error scraping TikTok:', error);
    res.status(500).json({ success: false, error: error.message });
  }

}

AppController.sendemail = async (req, res) => {
  try { 
    // await index.email(req.body)
    res.sendStatus(200);
  } catch (error) {
    console.error(error); 
    res.status(500).json({ success: false, error: error.message });
  }

}

AppController.consultaCortes = async (req, res) => {
  try { 
    
    console.log('Request body en consultaCortes:', req.body); // Verifica el cuerpo completo de la solicitud
    const { cedula } = req.body;

    // Verifica que la cédula está llegando correctamente
    console.log('Cédula recibida:', cedula);
    
    // Busca el cliente por DNI
    const cliente = await Clientsdb.findOne({ dni: cedula });
    console.log('Cliente:', cliente);

    if (!cliente) {
      console.log('Cliente no encontrado');
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado. ¡Te invitamos a convertirte en nuestro cliente y disfrutar de nuestros servicios!' 
      });
    }

    // Imprime los nombres y apellidos del cliente
    console.log('Nombres del cliente:', cliente.names);
    console.log('Apellidos del cliente:', cliente.lastNames);

    // Filtrar las ventas que no tienen ningún descuento del jueves
    const validSales = await Sales.find({
      client: cliente._id,
      'productsOrServices.discount': { $ne: new mongoose.Types.ObjectId('679bcbd86c52e04db5ed9b31') }
    });
    const productsservices = await ProductServices.find({name: 'CORTE GENERAL'});
    const haircutCounter = await HaircutCounters.findOne({ service: productsservices[0]._id, customer: cliente._id});

    
    // Check for FIDELITY_DISCOUNT
    const discount = await Discounts.findOne({ name: 'FIDELITY_DISCOUNT', 'customers.customer': cliente._id });
    if (discount) {
      const customerDiscount = discount.customers.find(c => c.customer.toString() === cliente._id.toString());
      if (customerDiscount && customerDiscount.freeCuts > 0) {
        console.log('El cliente tiene un corte gratis con el descuento FIDELITY_DISCOUNT');
        // Realiza una consulta en la colección sales para obtener las últimas 5 ventas
        const sales = await Sales.aggregate([
          { $match: { _id: { $in: validSales.map(sale => sale._id) } } },
          { $unwind: '$productsOrServices' },
          { $match: { 'productsOrServices.item': productsservices[0]._id } },
          {
            $lookup: {
              from: 'discounts',
              localField: 'productsOrServices.discount',
              foreignField: '_id',
              as: 'discountDetails'
            }
          },
          { $unwind: '$discountDetails' },
          { $match: { 'discountDetails.name': { $ne: 'DESCUENTO JUEVES' } } }, // Filtrar los cortes con el descuento del Jueves
          {
            $group: {
              _id: '$_id',
              client: { $first: '$client' },
              productsOrServices: { $push: '$productsOrServices' },
              saleDate: { $first: '$saleDate' },
              barber: { $first: '$barber' },
              discountDetails: { $push: '$discountDetails' }
            }
          },
          {
            $match: {
              'discountDetails.name': { $ne: 'DESCUENTO JUEVES' }
            }
          },
          { $sort: { saleDate: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'users',
              localField: 'barber',
              foreignField: '_id',
              as: 'barber'
            }
          },
          { $unwind: '$barber' },
          {
            $lookup: {
              from: 'personaldatas',
              localField: 'barber.personalData',
              foreignField: '_id',
              as: 'barbername'
            }
          },
          { $unwind: '$barbername' },
          {
            $lookup: {
              from: 'productservices',
              localField: 'productsOrServices.item',
              foreignField: '_id',
              as: 'productsOrServices.item'
            }
          },
          { $unwind: '$productsOrServices.item' },
          {
            $project: {
              barber: {
                firstnames: '$barbername.firstnames',
                firstnames1: '$barbername.firstnames1',
                lastnames: '$barbername.lastnames',
                lastnames1: '$barbername.lastnames1'
              },
              productServiceName: '$productsOrServices.item.name',
              saleDate: 1
            }
          }
        ]);
        if (!sales || sales.length === 0) {
          console.log('No se encontraron ventas asociadas al cliente:', cliente._id.toHexString());
        } else {
          console.log('Ventas del cliente:', sales);
        }
        return res.status(200).json({ 
          success: true, 
          names: cliente.names, 
          lastNames: cliente.lastNames, 
          counter: 5, 
          services: sales.map(sale => sale.productServiceName), // Nombres de los servicios
          barbers: sales.map(sale => `${sale.barber.firstnames} ${sale.barber.firstnames1} ${sale.barber.lastnames} ${sale.barber.lastnames1}`), // Nombres completos de los barberos
          dates: sales.map(sale => sale.saleDate.toISOString().split('T')[0]), // Fechas de las ventas en formato YYYY-MM-DD
          sales: sales, // Include the sales data
          message: '¡Felicidades! Tienes un corte gratis con nuestro descuento de fidelidad.'
        });
      }
    }


    
    if (!haircutCounter) {
      console.log('El cliente no tiene aún cortes registrados:', cliente._id.toHexString());
      return res.status(200).json({ 
        success: true, 
        names: cliente.names, 
        lastNames: cliente.lastNames, 
        counter: 0, 
        services: [], 
        barbers: [], 
        dates: [], 
        sales: [] 
      });
    } else {
      console.log('Contador de cortes:', haircutCounter.counter);

      // Cuenta el número de ventas con el servicio de CORTE GENERAL
      const corteGeneralCount = await Sales.countDocuments({
        client: cliente._id,
        'productsOrServices.item': productsservices[0]._id
      });

      console.log('Número de ventas con el servicio de CORTE GENERAL:', corteGeneralCount);

      // Implementa la condición de seguridad
      if (haircutCounter.counter > corteGeneralCount) {
        haircutCounter.counter = corteGeneralCount;
        console.log('El contador de cortes se ha ajustado al número de ventas con el servicio de CORTE GENERAL:', corteGeneralCount);
      }
    }

    // Check if the haircut counter is less than 1
    if (haircutCounter.counter < 1) {
      console.log('El cliente no tiene cortes');
      return res.status(200).json({ 
        success: true, 
        names: cliente.names, 
        lastNames: cliente.lastNames, 
        counter: 0, 
        services: [], 
        barbers: [], 
        dates: [], 
        sales: [] 
      });
    }
    

    // Realiza una consulta en la colección sales para obtener las últimas ventas válidas
    const sales = await Sales.aggregate([
      { $match: { _id: { $in: validSales.map(sale => sale._id) } } },
      { $unwind: '$productsOrServices' },
      { $match: { 'productsOrServices.item': productsservices[0]._id } },
      {
        $lookup: {
          from: 'discounts',
          localField: 'productsOrServices.discount',
          foreignField: '_id',
          as: 'discountDetails'
        }
      },
      { $unwind: '$discountDetails' },
      { $match: { 'discountDetails.name': { $ne: 'DESCUENTO JUEVES' } } }, // Filtrar los cortes con el descuento del Jueves
      {
        $group: {
          _id: '$_id',
          client: { $first: '$client' },
          productsOrServices: { $push: '$productsOrServices' },
          saleDate: { $first: '$saleDate' },
          barber: { $first: '$barber' },
          discountDetails: { $push: '$discountDetails' }
        }
      },
      {
        $match: {
          'discountDetails.name': { $ne: 'DESCUENTO JUEVES' }
        }
      },
      { $sort: { saleDate: -1 } },
      { $limit: haircutCounter.counter },
      {
        $lookup: {
          from: 'users',
          localField: 'barber',
          foreignField: '_id',
          as: 'barber'
        }
      },
      { $unwind: '$barber' },
      {
        $lookup: {
          from: 'personaldatas',
          localField: 'barber.personalData',
          foreignField: '_id',
          as: 'barbername'
        }
      },
      { $unwind: '$barbername' },
      {
        $lookup: {
          from: 'productservices',
          localField: 'productsOrServices.item',
          foreignField: '_id',
          as: 'productsOrServices.item'
        }
      },
      { $unwind: '$productsOrServices.item' },
      {
        $project: {
          barber: {
            firstnames: '$barbername.firstnames',
            firstnames1: '$barbername.firstnames1',
            lastnames: '$barbername.lastnames',
            lastnames1: '$barbername.lastnames1'
          },
          productServiceName: '$productsOrServices.item.name',
          saleDate: 1
        }
      }
    ]);

    if (!sales || sales.length === 0) {
      console.log('No se encontraron ventas asociadas al cliente:', cliente._id.toHexString());
    } else {
      console.log('Ventas del cliente:', sales);
    }
    // Aquí puedes agregar la lógica adicional que necesites
    res.status(200).json({ 
      success: true, 
      names: cliente.names, 
      lastNames: cliente.lastNames, 
      counter: haircutCounter ? haircutCounter.counter : 0, 
      services: sales.map(sale => sale.productServiceName), // Nombres de los servicios
      barbers: sales.map(sale => `${sale.barber.firstnames} ${sale.barber.firstnames1} ${sale.barber.lastnames} ${sale.barber.lastnames1}`), // Nombres completos de los barberos
      dates: sales.map(sale => sale.saleDate.toISOString().split('T')[0]), // Fechas de las ventas en formato YYYY-MM-DD
      sales: sales // Include the sales data
    });
  } catch (error) {
    console.log('Error en consultaCortes:', error);
    console.error(error); 
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = AppController;