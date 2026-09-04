const UserCommissionController = {};
const UserCommissionModels = require('../models/UserCommissionModels');

UserCommissionController.listByUser = async (req, res) => {
    try {

        const commissions = await UserCommissionModels.listByUser(req.params.userId);
        // console.log(commissions)
        res.status(200).json(commissions);
    } catch (error) {

        res.status(500).json({ message: error.message });
    }
};

UserCommissionController.create = async (req, res) => {
    try {
        const commission = await UserCommissionModels.create(req.body);
        res.status(201).json(commission);
    } catch (error) {
        const status = error.code === 'COMMISSION_DUPLICATE' ? 409
            : ['USER_NOT_FOUND', 'SERVICE_NOT_FOUND'].includes(error.code) ? 404 : 400;
        res.status(status).json({ message: error.message, code: error.code || null });
    }
};

UserCommissionController.update = async (req, res) => {
    try {
        const commission = await UserCommissionModels.update(req.params.id, req.body);
        res.status(200).json(commission);
    } catch (error) {
        const status = error.code === 'COMMISSION_NOT_FOUND' ? 404 : 400;
        res.status(status).json({ message: error.message, code: error.code || null });
    }
};

UserCommissionController.remove = async (req, res) => {
    try {
        await UserCommissionModels.remove(req.params.id);
        res.status(200).json({ message: 'Comisión eliminada correctamente.' });
    } catch (error) {
        const status = error.code === 'COMMISSION_NOT_FOUND' ? 404 : 400;
        res.status(status).json({ message: error.message, code: error.code || null });
    }
};

module.exports = UserCommissionController;