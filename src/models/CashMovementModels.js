const CashMovementModels = {};
const CashSession = require('../db/cashSession.model');
const CashMovement = require('../db/cashMovement.model');
const { uploadMultipleFilesToS3, getSignedAttachmentUrls } = require('../utils/s3Utils');

CashMovementModels.create = async (data, files, userId) => {
    const { type, amount, description, session } = data;

    if (!['income', 'expense'].includes(type)) {
        const err = new Error('El tipo de movimiento debe ser "income" o "expense".');
        err.code = 'CASH_MOVEMENT_INVALID_TYPE';
        throw err;
    }

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        const err = new Error('Debe ingresar un monto válido.');
        err.code = 'CASH_MOVEMENT_INVALID_AMOUNT';
        throw err;
    }

    if (!description || !description.trim()) {
        const err = new Error('Debe ingresar una descripción del movimiento.');
        err.code = 'CASH_MOVEMENT_INVALID_DESCRIPTION';
        throw err;
    }

    const openSession = await CashSession.findOne({ _id: session, status: 'open' });
    if (!openSession) {
        const err = new Error('La caja no está abierta o la sesión indicada no existe.');
        err.code = 'CASH_SESSION_NOT_OPEN';
        throw err;
    }

    const attachments = await uploadMultipleFilesToS3(files);

    const movement = await CashMovement.create({
        session: openSession._id,
        type,
        amount,
        description,
        attachments,
        createdBy: userId,
    });

    return movement;
};

CashMovementModels.listBySession = async (sessionId, query) => {
    const { page = 1, limit = 20 } = query;

    const result = await CashMovement.paginate(
        { session: sessionId },
        {
            page: Number(page),
            limit: Number(limit),
            sort: { createdAt: -1 },
            populate: { path: 'createdBy', select: 'username' },
        }
    );

    // 🔹 Firmamos las URLs de los adjuntos de cada movimiento del listado
    const signedDocs = await Promise.all(
        result.docs.map(async (doc) => {
            const movement = doc.toObject();
            movement.attachments = await getSignedAttachmentUrls(movement.attachments, 300);
            return movement;
        })
    );

    return {
        ...result,
        docs: signedDocs,
    };
};
// 🔹 NUEVO: detalle de un movimiento con URLs firmadas
CashMovementModels.getById = async (movementId) => {
    console.log(movementId)
    const movement = await CashMovement.findById(movementId)
        .populate('createdBy', 'username email')
        .populate({
            path: 'session',
            select: 'status openingDate closingDate openedBy',
            populate: { path: 'openedBy', select: 'username' },
        });

    if (!movement) {
        const err = new Error('Movimiento de caja no encontrado.');
        err.code = 'CASH_MOVEMENT_NOT_FOUND';
        throw err;
    }

    const signedAttachments = await getSignedAttachmentUrls(movement.attachments, 300); // 5 min

    return {
        ...movement.toObject(),
        attachments: signedAttachments,
    };

};

// 🔹 Últimos N movimientos de caja de todas las sesiones (para dashboard)
CashMovementModels.getRecentMovements = async (limit = 10) => {
    const movements = await CashMovement.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('createdBy', 'username')
        .populate('session', 'status openingDate')
        .lean();

    const signedMovements = await Promise.all(
        movements.map(async (m) => ({
            ...m,
            attachments: await getSignedAttachmentUrls(m.attachments, 300),
        }))
    );

    return signedMovements;
};
CashMovementModels.getDailyMovements = async () => {
    const now = new Date(new Date().getTime() - 5 * 60 * 60 * 1000);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const movements = await CashMovement.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
    })
        .sort({ createdAt: 1 })
        .populate('createdBy', 'username')
        .populate('session', 'status openingDate')
        .lean();

    const totalIncome = movements.filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0);
    const totalExpense = movements.filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0);

    return {
        movements,
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
        netMovements: Math.round((totalIncome - totalExpense) * 100) / 100,
    };
};
module.exports = CashMovementModels;