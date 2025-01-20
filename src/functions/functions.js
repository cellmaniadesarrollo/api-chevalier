const functions = {};
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const Sequential=require("../db/counters")
const Client = require('../db/clients'); 
const Discount=require("../db/discounts") 
const Service=require('../db/productservices')
const HaircutCounter=require('../db/haircutcounters')

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
functions.hasFreeCuts=async (customerId , serviceName = "CORTE GENERAL",discountName="FIDELITY_DISCOUNT")=>{
    try {
        // Buscar el servicio por nombre
        const serviceget = await Service.findOne({ name: serviceName });
        if (!serviceget) {
          console.log(`El servicio "${serviceName}" no fue encontrado.`);
          return false;
        }
    
        // Buscar el descuento asociado al servicio y cliente
        let discount = await Discount.findOne({
          name: discountName,
          productsOrServices: serviceget._id,
          'customers.customer': customerId,
        });
    
        // Si el descuento no existe para el cliente, agregar al cliente
        if (!discount) {
          console.log('No se encontró un descuento para este cliente y servicio. Agregando al descuento...');
          discount = await Discount.findOneAndUpdate(
            { name: discountName, productsOrServices: serviceget._id }, // Buscar por descuento y servicio
            {
              $push: {
                customers: { 
                  customer: customerId, 
                  freeCuts: 0, // Se inicializa sin cortes gratuitos
                  discountValue: null, // Valor específico del descuento (puede ajustarse)
                },
              },
            },
            { new: true, upsert: true } // Crear si no existe
          );
          console.log('Cliente agregado al descuento.');
        }
    
        // Verificar si el cliente tiene cortes gratuitos disponibles
        const customerData = discount.customers.find(c => c.customer.toString() === customerId.toString());
        return customerData && customerData.freeCuts > 0;
      } catch (error) {
        console.error('Error en hasFreeCuts:', error);
        return false;
      }
}
functions.manageHaircutCounter=async (customerId , serviceName = "CORTE GENERAL",discountName="FIDELITY_DISCOUNT")=>{
    try {
        // Buscar el servicio por nombre
        const serviceget = await Service.findOne({ name: serviceName });
        if (!serviceget) {
          console.log(`El servicio "${serviceName}" no fue encontrado.`);
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
    
        // Si el contador llega a 6, reiniciar y actualizar el descuento
        if (counter.counter === 6) {
          counter.counter = 0; // Reiniciar el contador
          console.log('El contador alcanzó 6. Reiniciando a 0.');
    
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
module.exports = functions;
 