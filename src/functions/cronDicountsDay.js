const Discounts = require('../db/discounts');
const Clients = require('../db/clients');

async function aplicarDescuentosDelDia() {
  try {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date();
    finDia.setHours(23, 59, 59, 999);

    console.log(`[CRON] Ejecutando aplicarDescuentosDelDia - Día: ${diaSemana}`);

    // ✅ Solo descuentos que aplican hoy y no son globales
    const descuentos = await Discounts.find({
      isGlobal: false,
      daysOfWeek: { $in: [diaSemana] },
    }).populate('customers.customer');

    if (descuentos.length === 0) {
      console.log('[CRON] No hay descuentos aplicables hoy.');
      return;
    }

    for (const descuento of descuentos) {
      console.log(`Procesando descuento: ${descuento.name}`);

      // Si el descuento no está activo hoy, actualizamos las fechas
      if (!(descuento.validFrom <= inicioDia && descuento.validUntil >= finDia)) {
        descuento.validFrom = inicioDia;
        descuento.validUntil = finDia;
        console.log(`➡️ Activando descuento '${descuento.name}' para hoy.`);
      }

      // Aplicar a todos los clientes (manteniendo isGlobal:false para manejar freeCuts)
      const todosClientes = await Clients.find({}, '_id');

      for (const cliente of todosClientes) {
        const existe = descuento.customers.find(c =>
          c.customer.equals(cliente._id)
        );

        if (existe) {
          existe.freeCuts = 1;
        } else {
          descuento.customers.push({
            customer: cliente._id,
            freeCuts: 1,
          });
        }
      }

      await descuento.save();
      console.log(`✅ Descuento '${descuento.name}' actualizado correctamente.`);
    }

    console.log('[CRON] Todos los descuentos del día han sido procesados.');
  } catch (error) {
    console.error('[CRON ERROR] Error al aplicar descuentos del día:', error);
  }
}

module.exports = { aplicarDescuentosDelDia };
module.exports = { aplicarDescuentosDelDia };
