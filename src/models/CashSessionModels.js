const CashSessionModels = {};
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const CashSession = require('../db/cashSession.model');
const CashMovement = require('../db/cashMovement.model'); // 🔹 nuevo
const Sales = require('../db/sales');
const { getLocalDate, isSameDay, isWithinCashWindow, getCashPaymentMethodId } = require('../utils/cashSessionUtils');

// 🔹 Suma neta de movimientos manuales (entradas - salidas) de una sesión
async function getSessionMovementsTotal(sessionId) {
    const result = await CashMovement.aggregate([
        { $match: { session: new ObjectId(sessionId) } },
        {
            $group: {
                _id: '$type',
                total: { $sum: '$amount' }
            }
        }
    ]);

    const income = result.find(r => r._id === 'income')?.total || 0;
    const expense = result.find(r => r._id === 'expense')?.total || 0;

    return { income, expense, net: income - expense };
}

// Cálculo compartido: cuánto debería haber al abrir
async function calculateExpectedOpeningAmount() {
    const cashMethodId = await getCashPaymentMethodId();

    const lastClosed = await CashSession.findOne({ status: 'closed' }).sort({ closingDate: -1 });
    const lastCashLeft = lastClosed ? lastClosed.cashLeftForNextDay : 0;

    const orphanSales = await Sales.find({ cashSession: null }).populate('paymentDetails');
    const orphanCashTotal = orphanSales
        .filter(s => s.paymentDetails?.paymentMethod?.toString() === cashMethodId.toString())
        .reduce((sum, s) => sum + (s.paymentDetails?.amount || 0), 0);

    return {
        expectedOpeningAmount: (lastCashLeft || 0) + orphanCashTotal,
        lastCashLeft: lastCashLeft || 0,
        orphanCashTotal,
        orphanSalesCount: orphanSales.length,
        lastClosedSession: lastClosed || null,
        orphanSales,
    };
}

CashSessionModels.getOpeningPreview = async () => {
    const existingOpen = await CashSession.findOne({ status: 'open' });
    if (existingOpen) {
        const err = new Error('Ya existe una sesión de caja abierta o pendiente.');
        err.code = 'CASH_SESSION_ALREADY_OPEN';
        throw err;
    }

    const { expectedOpeningAmount, lastCashLeft, orphanCashTotal, orphanSalesCount, lastClosedSession } =
        await calculateExpectedOpeningAmount();

    return {
        expectedOpeningAmount,
        lastCashLeft,
        orphanCashTotal,
        orphanSalesCount,
        lastClosingDate: lastClosedSession?.closingDate || null,
    };
};

CashSessionModels.open = async (data, userId) => {
    const existingOpen = await CashSession.findOne({ status: 'open' });
    const local = getLocalDate();

    if (existingOpen) {
        if (isSameDay(existingOpen.openingDate, local)) {
            return { alreadyOpen: true, session: existingOpen };
        }
        const err = new Error('Existe una sesión de caja sin cerrar del día anterior. Debe cerrarla antes de abrir una nueva.');
        err.code = 'CASH_SESSION_PENDING';
        err.pendingSessionId = existingOpen._id;
        throw err;
    }

    if (data.declaredOpeningAmount === undefined || data.declaredOpeningAmount === null || isNaN(data.declaredOpeningAmount)) {
        const err = new Error('Debe ingresar un monto válido para abrir la caja.');
        err.code = 'CASH_SESSION_INVALID_AMOUNT';
        throw err;
    }

    const { expectedOpeningAmount, orphanSales } = await calculateExpectedOpeningAmount();

    const declaredOpeningAmount = data.declaredOpeningAmount;
    const openingDifference = declaredOpeningAmount - expectedOpeningAmount;

    const newSession = await CashSession.create({
        openedBy: userId,
        expectedOpeningAmount,
        declaredOpeningAmount,
        openingDifference,
        openingAlert: openingDifference !== 0,
        openingDate: new Date(),
        status: 'open',
    });

    if (orphanSales.length) {
        await Sales.updateMany({ cashSession: null }, { $set: { cashSession: newSession._id } });
    }

    return { alreadyOpen: false, session: newSession };
};

CashSessionModels.getStatus = async () => {
    const cashMethodId = await getCashPaymentMethodId();
    const openSession = await CashSession.findOne({ status: 'open' });
    const local = getLocalDate();

    if (openSession) {
        if (isSameDay(openSession.openingDate, local)) {
            const sessionSales = await Sales.find({ cashSession: openSession._id }).populate('paymentDetails');
            const salesCashTotal = sessionSales
                .filter(s => s.paymentDetails?.paymentMethod?.toString() === cashMethodId.toString())
                .reduce((sum, s) => sum + (s.paymentDetails?.amount || 0), 0);

            // 🔹 movimientos manuales (entradas/salidas) de la sesión
            const movements = await getSessionMovementsTotal(openSession._id);

            const currentExpectedCash =
                (openSession.declaredOpeningAmount || 0) + salesCashTotal + movements.net;

            return {
                hasActiveSession: true,
                session: openSession,
                currentExpectedCash,
                salesCashTotal,
                movements, // 🔹 { income, expense, net }
            };
        }
        return { hasActiveSession: false, needsToClosePending: true, pendingSession: openSession };
    }

    return {
        hasActiveSession: false,
        needsToClosePending: false,
        isWithinMandatoryWindow: isWithinCashWindow(local),
    };
};

CashSessionModels.close = async (data, userId) => {
    const cashMethodId = await getCashPaymentMethodId();
    const openSession = await CashSession.findOne({ status: 'open' });
    if (!openSession) {
        const err = new Error('No hay ninguna sesión de caja abierta para cerrar.');
        err.code = 'CASH_SESSION_NOT_OPEN';
        throw err;
    }

    const { countedAmount, cashDelivered, cashLeftForNextDay, notes } = data;
    if ([countedAmount, cashDelivered, cashLeftForNextDay].some(v => v === undefined || v === null || isNaN(v))) {
        const err = new Error('Debe ingresar el monto contado, el entregado y el fondo para el día siguiente.');
        err.code = 'CASH_SESSION_INVALID_CLOSE_DATA';
        throw err;
    }

    const sessionSales = await Sales.find({ cashSession: openSession._id }).populate('paymentDetails');
    const salesCashTotal = sessionSales
        .filter(s => s.paymentDetails?.paymentMethod?.toString() === cashMethodId.toString())
        .reduce((sum, s) => sum + (s.paymentDetails?.amount || 0), 0);

    // 🔹 movimientos manuales (entradas/salidas) de la sesión
    const movements = await getSessionMovementsTotal(openSession._id);

    const expectedCashAmount =
        (openSession.declaredOpeningAmount || 0) + salesCashTotal + movements.net;
    const closingDifference = countedAmount - expectedCashAmount;
    const deliveryMismatch = (cashDelivered + cashLeftForNextDay) !== countedAmount;

    const updated = await CashSession.findByIdAndUpdate(
        openSession._id,
        {
            closedBy: userId,
            status: 'closed',
            expectedCashAmount,
            countedAmount,
            closingDifference,
            closingAlert: closingDifference !== 0,
            cashDelivered,
            cashLeftForNextDay,
            closingDate: new Date(),
            notes: notes || '',
        },
        { new: true }
    );

    return {
        session: updated,
        deliveryMismatch,
        movements, // 🔹 se devuelve para que el front pueda mostrar el detalle
    };
};
CashSessionModels.list = async (query) => {
    const { page = 1, limit = 20, status } = query;

    const filter = {};
    if (status) filter.status = status;

    const result = await CashSession.paginate(filter, {
        page: Number(page),
        limit: Number(limit),
        sort: { openingDate: -1 },
        populate: [
            { path: 'openedBy', select: 'username' },
            { path: 'closedBy', select: 'username' },
        ],
    });

    return result;
};
// 🔹 Últimas N sesiones de caja (para dashboard)
CashSessionModels.getRecentSessions = async (limit = 10) => {
    const cashMethodId = await getCashPaymentMethodId();

    // Traemos sesiones cerradas (tienen ambos extremos) y abiertas activas
    const sessions = await CashSession.find()
        .sort({ openingDate: -1 })
        .limit(limit)
        .populate('openedBy', 'username')
        .populate('closedBy', 'username')
        .lean();

    const enrichedSessions = await Promise.all(
        sessions.map(async (session) => {

            // ── Ventas huérfanas (efectivo entre cierre anterior y esta apertura) ──
            const previousClosed = await CashSession.findOne({
                status: 'closed',
                closingDate: { $lt: session.openingDate }
            }).sort({ closingDate: -1 });

            let orphanSalesCount = 0;
            let orphanCashTotal = 0;

            if (previousClosed) {
                const orphanSales = await Sales.find({
                    createdAt: {
                        $gte: previousClosed.closingDate,
                        $lte: session.openingDate
                    },
                    cashSession: null
                }).populate('paymentDetails');

                const cashOrphans = orphanSales.filter(
                    s => s.paymentDetails?.paymentMethod?.toString() === cashMethodId?.toString()
                );

                orphanSalesCount = cashOrphans.length;
                orphanCashTotal = cashOrphans.reduce((sum, s) => sum + (s.paymentDetails?.amount || 0), 0);
            }

            // ── Alerta de apertura ──
            const openingOrphanMatch =
                session.openingAlert &&
                Math.round(session.openingDifference * 100) === Math.round(orphanCashTotal * 100);

            // Determinar estado de apertura
            let openingStatus = 'ok'; // 'ok' | 'explained' | 'warning'
            if (session.openingAlert) {
                openingStatus = openingOrphanMatch ? 'explained' : 'warning';
            }

            // ── Alertas de cierre (solo si está cerrada) ──
            let closingStatus = null;         // null = aún abierta
            let deliveryMismatch = false;
            let deliveryMismatchAmount = 0;

            if (session.status === 'closed') {
                const counted = session.countedAmount ?? 0;
                const delivered = session.cashDelivered ?? 0;
                const leftOver = session.cashLeftForNextDay ?? 0;

                deliveryMismatch =
                    Math.round((delivered + leftOver) * 100) !== Math.round(counted * 100);
                deliveryMismatchAmount = counted - (delivered + leftOver);

                // Estado global del cierre
                if (!session.closingAlert && !deliveryMismatch) closingStatus = 'ok';
                else if (session.closingAlert && deliveryMismatch) closingStatus = 'double-warning';
                else if (session.closingAlert) closingStatus = 'count-warning';
                else closingStatus = 'delivery-warning';
            }

            return {
                ...session,
                // Apertura
                orphanSalesCount,
                orphanCashTotal,
                openingOrphanMatch,
                openingStatus,
                // Cierre
                closingStatus,
                deliveryMismatch,
                deliveryMismatchAmount,
            };
        })
    );

    return enrichedSessions;
};
module.exports = CashSessionModels;