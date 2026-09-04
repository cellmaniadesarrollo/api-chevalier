const CashMovementController = {};
const CashMovementModels = require('../models/CashMovementModels');

CashMovementController.create = async (req, res) => {
    try {
        const movement = await CashMovementModels.create(req.body, req.files, req.user._id);
        res.status(201).json(movement);
    } catch (error) {
        res.status(400).json({
            message: error.message,
            code: error.code || null,
        });
    }
};

CashMovementController.listBySession = async (req, res) => {
    try {
        const result = await CashMovementModels.listBySession(req.params.sessionId, req.query);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 🔹 NUEVO
CashMovementController.getById = async (req, res) => {
    try {
        const movement = await CashMovementModels.getById(req.params.id);
        res.status(200).json(movement);
    } catch (error) {
        console.log(error)
        const status = error.code === 'CASH_MOVEMENT_NOT_FOUND' ? 404 : 500;
        res.status(status).json({ message: error.message, code: error.code || null });
    }
};

module.exports = CashMovementController;