// utils/cashSessionUtils.js
const PaymentMethodModel = require('../db/paymentMethods');

let cachedCashMethodId = null;

async function getCashPaymentMethodId() {
    if (cachedCashMethodId) return cachedCashMethodId;
    const cashMethod = await PaymentMethodModel.findOne({ name: 'EFECTIVO' });
    if (!cashMethod) throw new Error('No se encontró el método de pago EFECTIVO configurado.');
    cachedCashMethodId = cashMethod._id;
    return cachedCashMethodId;
}



function getLocalDate() {
    return new Date(); // ya quitamos el ajuste de -5h como pediste, para desarrollo
}

// function getLocalDate() {
//   const now = new Date();
//   return new Date(now.getTime() - (5 * 60 * 60 * 1000));
// }


function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function isWithinCashWindow(date) {
    const hour = date.getHours();
    return hour >= 8 && hour < 20;
}

module.exports = { getLocalDate, isSameDay, isWithinCashWindow, getCashPaymentMethodId };