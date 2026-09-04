const CashSessionController = {};
const CashSessionModels = require('../models/CashSessionModels')

CashSessionController.open = async (req, res) => {
    try {
        const result = await CashSessionModels.open(req.body, req.user._id);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({
            message: error.message,
            code: error.code || null, // 🔹
            pendingSessionId: error.pendingSessionId || null
        });
    }
};

CashSessionController.status = async (req, res) => {
    try {
        const result = await CashSessionModels.getStatus();
        // console.log(result)
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

CashSessionController.close = async (req, res) => {
    try {
        const result = await CashSessionModels.close(req.body, req.user._id);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({
            message: error.message,
            code: error.code || null // 🔹
        });
    }
};
CashSessionController.openingPreview = async (req, res) => {
    try {
        const result = await CashSessionModels.getOpeningPreview();
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message, code: error.code || null });
    }
};

CashSessionController.list = async (req, res) => {
    try {
        const result = await CashSessionModels.list(req.query);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
module.exports = CashSessionController;