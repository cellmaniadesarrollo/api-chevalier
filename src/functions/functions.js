const functions = {};
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Sequential = require("../db/counters");
const Client = require('../db/clients');
const Discount = require("../db/discounts");
const Service = require('../db/productservices');
const HaircutCounter = require('../db/haircutcounters');

functions.getSequential = async (data) => {
    try {
        const counter = await Sequential.findOneAndUpdate(
            { name: data }, // Nombre del contador que usaremos para ventas
            { $inc: { seq: 1 } }, // Incrementa el valor de "seq" en 1
            { new: true, upsert: true } // Crea el documento si no existe
          );
          return counter.seq;
  
    } catch (error) {
        throw error
    }


}

functions.hasFreeCuts = async (customerId) => {
  try {
    // Buscar el descuento de fidelidad
    const fidelityDiscount = await Discount.findOne({
      name: 'FIDELITY_DISCOUNT',
      'customers.customer': customerId,
    });

    // Verificar si el cliente tiene cortes gratuitos disponibles en el descuento de fidelidad
    if (fidelityDiscount) {
      const customerData = fidelityDiscount.customers.find(c => c.customer.toString() === customerId.toString());
      if (customerData && customerData.freeCuts > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error en hasFreeCuts:', error);
    return false;
  }
}

functions.manageHaircutCounter = async (customerId, serviceName = "CORTE GENERAL", discountName = "FIDELITY_DISCOUNT", selectedDiscountName = null) => {
  try {
    // Buscar el servicio por nombre
    const serviceget = await Service.findOne({ name: serviceName });
    if (!serviceget) {
      console.log(`El servicio "${serviceName}" no fue encontrado.`);
      return;
    }

    // Verificar si el descuento seleccionado es el del Jueves
    if (discountName === 'DESCUENTO JUEVES') {
      console.log('El descuento seleccionado es el del Jueves. No se incrementará el contador.');
      return;
    }

    // Buscar o crear el contador del cliente para este servicio
    let counter = await HaircutCounter.findOne({ customer: customerId, service: serviceget._id });

    if (!counter) {
      console.log('El cliente no tiene un contador. Creando uno nuevo...');
      counter = new HaircutCounter({
        customer: customerId,
        service: serviceget._id,
        counter: 0,
      });
    }

    // Incrementar el contador
    counter.counter += 1;
    console.log(`Contador incrementado: ${counter.counter}`);

    // Si el contador llega a 5, reiniciar y actualizar el descuento
    if (counter.counter >= 5) {
      counter.counter = 0; // Reiniciar el contador
      console.log('El contador alcanzó 5. Reiniciando a 0.');

      // Buscar el descuento asociado al servicio y cliente
      let discount = await Discount.findOne({
        name: discountName,
        productsOrServices: serviceget._id,
        'customers.customer': customerId,
      });

      if (!discount) {
        console.log('No se encontró un descuento para este cliente y servicio. Agregando al descuento...');
        discount = await Discount.findOneAndUpdate(
          { name: discountName, productsOrServices: serviceget._id }, // Buscar por descuento y servicio
          {
            $push: {
              customers: { 
                customer: customerId, 
                freeCuts: 1, // Inicializamos con un corte gratuito
                discountValue: null, // Valor específico del descuento
              },
            },
          },
          { new: true, upsert: true } // Crear si no existe
        );
      } else {
        // Incrementar los cortes gratuitos del cliente en el descuento
        const customerIndex = discount.customers.findIndex(c => c.customer.toString() === customerId.toString());
        if (customerIndex !== -1) {
          discount.customers[customerIndex].freeCuts += 1;
          console.log('Cortes gratuitos incrementados en el descuento.');
        }
      }

      await discount.save();
    }

    // Guardar los cambios en el contador
    await counter.save();
  } catch (error) {
    console.error('Error al gestionar el contador de cortes:', error);
  }
}
functions.applyDiscounts=async (saleData)=>{
    try {
        const { cliente, productosservcio } = saleData;
    
        for (const item of productosservcio) {
          const { _id: serviceId, discount: discountId } = item;
    
          // Verificar si hay un descuento aplicado
          if (!discountId) continue;
    
          // Obtener el descuento aplicado
          const discount = await Discount.findOne({ _id: discountId });
    
          if (!discount) {
            console.log(`No se encontró el descuento con ID: ${discountId}`);
            continue;
          }
    
          // Ignorar los descuentos globales
          if (discount.isGlobal) {
            console.log(`El descuento ${discountId} es global y no se modificará.`);
            continue;
          }
    
          // Verificar si el cliente está en el descuento y restar un corte gratuito
          const customerIndex = discount.customers.findIndex(
            (c) => c.customer.toString() === cliente.toString()
          );
    
          if (customerIndex === -1) {
            console.log(`El cliente no está asociado al descuento ${discountId}.`);
            continue;
          }
    
          // Restar un corte gratuito si está disponible
          const customerData = discount.customers[customerIndex];
          if (customerData.freeCuts > 0) {
            discount.customers[customerIndex].freeCuts -= 1;
            console.log(
              `Se restó un corte gratuito del cliente ${cliente} en el descuento ${discountId}.`
            );
          } else {
            console.log(
              `El cliente ${cliente} no tiene cortes gratuitos disponibles en el descuento ${discountId}.`
            );
          }
    
          // Guardar los cambios en el descuento
          await discount.save();
        }
        console.log('Proceso de descuentos completado.');
      } catch (error) {
        console.error('Error al aplicar los descuentos:', error);
      }
}
functions.updateBirthdayDiscount=async ()=>{
   
    try { 
  
      // Buscar el descuento de cumpleaños
      const birthdayDiscount = await Discount.findOne({ name: 'BIRTHDAY_DISCOUNT' });
      if (!birthdayDiscount) {
        console.log('No se encontró el descuento con nombre "BIRTHDAY_DISCOUNT".');
        return;
      }
  
      // Obtener la fecha actual (día y mes)
      const today = new Date();
      const todayDay = today.getDate();
      const todayMonth = today.getMonth() + 1; // En MongoDB los meses van de 1 a 12
  
      // Usar agregación para filtrar clientes que cumplen años hoy
      const clientsBirthdayToday = await Client.aggregate([
        {
          $match: {
            dateOfBirth: { $exists: true, $ne: null },
          },
        },
        {
          $project: {
            _id: 1,
            dateOfBirth: 1,
            day: { $dayOfMonth: '$dateOfBirth' },
            month: { $month: '$dateOfBirth' },
          },
        },
        {
          $match: {
            day: todayDay,
            month: todayMonth,
          },
        },
      ]);
  
      // Eliminar todos los clientes actuales del descuento
      birthdayDiscount.customers = [];
  
      // Agregar los clientes que cumplen años hoy
      clientsBirthdayToday.forEach(client => {
        birthdayDiscount.customers.push({
          customer: client._id,
          freeCuts: 1, // Asigna un corte gratuito
        });
      });
  
      // Guardar los cambios en el descuento
      await birthdayDiscount.save();
  
      console.log(
        `Actualización completada: ${clientsBirthdayToday.length} clientes cumplen años hoy y se les otorgó el descuento.`
      );
    } catch (error) {
      console.error('Error al actualizar el descuento de cumpleaños:', error);
    } 
}
functions.addClientToBirthdayDiscount=async (clientId)=>{
  try { 
    // Buscar el descuento de cumpleaños
    const birthdayDiscount = await Discount.findOne({ name: 'BIRTHDAY_DISCOUNT' });
    if (!birthdayDiscount) {
      console.log('No se encontró el descuento con nombre "BIRTHDAY_DISCOUNT".');
      return;
    }

    // Verificar si el cliente ya está en el descuento
    const clientExists = birthdayDiscount.customers.some(
      customer => customer.customer.toString() === clientId
    );

    if (clientExists) {
      console.log(`El cliente con ID ${clientId} ya tiene el descuento de cumpleaños.`);
      return;
    }

    // Agregar al cliente al descuento
    birthdayDiscount.customers.push({
      customer: clientId,
      freeCuts: 1, // Asigna un corte gratuito
    });

    // Guardar los cambios en el descuento
    await birthdayDiscount.save();

    console.log(`El cliente con ID ${clientId} fue agregado al descuento de cumpleaños.`);
  } catch (error) {
    console.error('Error al agregar el cliente al descuento de cumpleaños:', error);
  }
}
functions.isConsumidorFinal=async (clienteId)=>{
  try {
    const cliente = await Client.findOne({  _id: clienteId,names: "CONSUMIDOR", lastNames: "FINAL" });
    return !!cliente; // Retorna true si encuentra un cliente, false si no
  } catch (error) {
    console.error("Error al buscar cliente:", error);
    return false;
  }
}

functions.hasCorteGeneral=async ( productosservcio)=>{
  try {
    // Extraer los IDs de los productos del arreglo
    const productIds = productosservcio.map(producto => producto._id); 
    // Buscar si algún producto tiene el nombre "CORTE GENERAL"
    const product = await Service.findOne({ _id: { $in: productIds }, name: "CORTE GENERAL" });
 
    return !!product; // Retorna true si existe, false si no
  } catch (error) {
    console.error("Error al buscar productos:", error);
    return false;
  }
}

functions.taskAt8 = async () => {
  console.log('Ejecutando tarea a las 8 todos los jueves');
  try {
    // Buscar el descuento de jueves
    const thursdayDiscount = await Discount.findOne({ name: 'DESCUENTO JUEVES' });
    if (!thursdayDiscount) {
      console.log('No se encontró el descuento con nombre "DESCUENTO JUEVES".');
      return;
    }

    // Actualizar los campos validFrom y validUntil
    const now = new Date();
    const validFrom = new Date(now.setHours(8, 0, 0, 0)); // Inicio del descuento a las 8 AM (13h00 UTC) (Se debe colocar con la zona horaria local, sin importar que en la base de datos se almacene en UTC)
    const validUntil = new Date(now.setHours(12, 0, 0, 0)); // Fin del descuento a las 12 PM (17h00 UTC) (Se debe colocar con la zona horaria local, sin importar que en la base de datos se almacene en UTC)

    thursdayDiscount.validFrom = validFrom;
    thursdayDiscount.validUntil = validUntil;

    // Actualizar la cantidad de cortes gratis de los clientes a 1
    thursdayDiscount.customers = thursdayDiscount.customers.map(customer => ({
      ...customer,
      freeCuts: 1
    }));

    // Guardar los cambios en el descuento
    await thursdayDiscount.save();

    console.log(`El descuento "DESCUENTO JUEVES" ha sido actualizado con las nuevas fechas de validez y cortes gratis.`);

    return { validFrom, validUntil };
  } catch (error) {
    console.error('Error al actualizar las fechas del descuento de jueves:', error);
  }

  // Lógica provisional para agregar clientes al descuento del jueves (hasta mover de forma permanente los clientes al esquema)
  console.log('Ejecutando tarea a las 8 todos los jueves');
  try {
    // Buscar el descuento de jueves
    const thursdayDiscount = await Discount.findOne({ name: 'DESCUENTO JUEVES' });
    if (!thursdayDiscount) {
      console.log('No se encontró el descuento con nombre "DESCUENTO JUEVES".');
      return;
    }

    // Obtener todos los clientes
    const allClients = await Client.find({});

    // Agregar todos los clientes al descuento
    thursdayDiscount.customers = allClients.map(client => ({
      customer: client._id,
      freeCuts: 1, // Asigna un corte gratuito o ajusta según sea necesario
    }));

    // Guardar los cambios en el descuento
    await thursdayDiscount.save();

  } catch (error) {
    console.error('Error al agregar clientes al descuento de jueves:', error);
  }
};

functions.updateClientOfTheYearDiscount = async () => {
  try {
    // Buscar el descuento de "CLIENTE DEL AÑO"
    const clientOfTheYearDiscount = await Discount.findOne({ name: 'CLIENTE DEL AÑO' });
    if (!clientOfTheYearDiscount) {
      console.log('No se encontró el descuento con nombre "CLIENTE DEL AÑO".');
      return;
    }

    // Actualizar el campo freeCuts a 1 para el cliente dentro del descuento
    clientOfTheYearDiscount.customers.forEach(customer => {
      customer.freeCuts = 10;
    });

    // Guardar los cambios en el descuento
    await clientOfTheYearDiscount.save();

    console.log('El descuento "CLIENTE DEL AÑO" ha sido actualizado con un corte gratuito.');
  } catch (error) {
    console.error('Error al actualizar el descuento "CLIENTE DEL AÑO":', error);
  }
};

functions.hasThursdayFreeCuts = async (customerId) => {
  try {
    // Buscar el descuento del jueves
    const thursdayDiscount = await Discount.findOne({ name: 'DESCUENTO JUEVES' });

    if (!thursdayDiscount) {
      console.log('No se encontró el descuento con nombre "DESCUENTO JUEVES".');
      return false;
    }

    // Verificar si el cliente tiene cortes gratuitos disponibles en el descuento del jueves
    const customerData = thursdayDiscount.customers.find(c => c.customer.toString() === customerId.toString());
    if (customerData && customerData.freeCuts > 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error en hasThursdayFreeCuts:', error);
    return false;
  }
}

functions.hasClientOfYearFreeCuts = async (customerId) => {
  try {
    // Buscar el descuento de "CLIENTE DEL AÑO"
    const clientOfTheYearDiscount = await Discount.findOne({
      name: 'CLIENTE DEL AÑO',
      'customers.customer': customerId,
    });

    // Verificar si el cliente tiene cortes gratuitos disponibles en el descuento de "CLIENTE DEL AÑO"
    if (clientOfTheYearDiscount) {
      const customerData = clientOfTheYearDiscount.customers.find(c => c.customer.toString() === customerId.toString());
      if (customerData && customerData.freeCuts > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error en hasClientOfTheYearDiscount:', error);
    return false;
  }
}

module.exports = functions;