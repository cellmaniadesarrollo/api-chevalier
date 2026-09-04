const mongoose = require('mongoose');
const CashSession = require('./cashSession.model');
const Sale = require('./sales');

// Usuario responsable asignado para la sesión legacy (dato provisto manualmente)
const LEGACY_USER_ID = '67182625b5459045ba08f14c';

// Tag único para identificar esta sesión y evitar crearla dos veces
const LEGACY_TAG = 'LEGACY_MIGRATION_2026-09-03';

/**
 * Crea (si no existe) la sesión de caja "de ayer" (03-09-2026) y
 * reasigna a ella todas las ventas que no tengan cashSession.
 *
 * Pensado para correr UNA sola vez al levantar el server.
 * Luego de ejecutarse con éxito, comentar la llamada en index.js.
 */
async function migrateLegacySales() {
    try {
        console.log('[migrateLegacySales] Iniciando migración legacy...');

        // Fecha "de ayer": 03-09-2026
        const openingDate = new Date('2026-09-03T00:00:00.000-05:00');
        const closingDate = new Date('2026-09-03T23:59:59.000-05:00');

        // 1. Buscar si la sesión legacy ya fue creada (idempotencia)
        let legacySession = await CashSession.findOne({ notes: LEGACY_TAG });

        if (!legacySession) {
            legacySession = await CashSession.create({
                openedBy: LEGACY_USER_ID,
                closedBy: LEGACY_USER_ID,
                status: 'closed',
                expectedOpeningAmount: 0,
                declaredOpeningAmount: 0,
                openingDifference: 0,
                openingAlert: false,
                openingDate,
                expectedCashAmount: 0,
                countedAmount: 0,
                closingDifference: 0,
                closingAlert: false,
                cashDelivered: 0,
                cashLeftForNextDay: 0,
                closingDate,
                notes: LEGACY_TAG,
            });
            console.log(`[migrateLegacySales] Sesión legacy creada: ${legacySession._id}`);
        } else {
            console.log(`[migrateLegacySales] Sesión legacy ya existía: ${legacySession._id}`);
        }

        // 2. Actualizar todas las ventas sin cashSession (null o campo inexistente)
        const filter = {
            $or: [
                { cashSession: null },
                { cashSession: { $exists: false } },
            ],
        };

        const result = await Sale.updateMany(filter, {
            $set: { cashSession: legacySession._id },
        });

        console.log(
            `[migrateLegacySales] Ventas actualizadas: ${result.modifiedCount} (matched: ${result.matchedCount})`
        );
        console.log('[migrateLegacySales] Migración legacy completada con éxito.');
    } catch (error) {
        console.error('[migrateLegacySales] Error en la migración legacy:', error);
    }
}

module.exports = { migrateLegacySales };