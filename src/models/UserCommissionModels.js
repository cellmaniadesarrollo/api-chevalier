const UserCommissionModels = {};
const UserCommission = require('../db/usercommissions');
const User = require('../db/users');
const ProductService = require('../db/productservices');

UserCommissionModels.listByUser = async (userId) => {

    try {
        return UserCommission.find({ user: userId })
            .populate('service', 'cod name isFixedPrice price prices')
            .sort({ createdAt: -1 });
    } catch (error) {
        console.log(error)
        throw error
    }

};

UserCommissionModels.create = async (data) => {
    const { user, service, servicePrice = null, rate } = data;

    const userExists = await User.findById(user);
    if (!userExists) {
        const err = new Error('Usuario no encontrado.');
        err.code = 'USER_NOT_FOUND';
        throw err;
    }

    const serviceExists = await ProductService.findById(service);
    if (!serviceExists) {
        const err = new Error('Servicio no encontrado.');
        err.code = 'SERVICE_NOT_FOUND';
        throw err;
    }

    const duplicate = await UserCommission.findOne({ user, service, servicePrice });
    if (duplicate) {
        const err = new Error('Ya existe una comisión configurada para este usuario, servicio y valor.');
        err.code = 'COMMISSION_DUPLICATE';
        throw err;
    }

    return UserCommission.create({ user, service, servicePrice, rate });
};

UserCommissionModels.update = async (id, data) => {
    const { servicePrice, rate } = data;

    const commission = await UserCommission.findById(id);
    if (!commission) {
        const err = new Error('Comisión no encontrada.');
        err.code = 'COMMISSION_NOT_FOUND';
        throw err;
    }

    if (servicePrice !== undefined) commission.servicePrice = servicePrice;
    if (rate !== undefined) commission.rate = rate;

    await commission.save();
    return commission;
};

UserCommissionModels.remove = async (id) => {
    const commission = await UserCommission.findByIdAndDelete(id);
    if (!commission) {
        const err = new Error('Comisión no encontrada.');
        err.code = 'COMMISSION_NOT_FOUND';
        throw err;
    }
    return commission;
};

module.exports = UserCommissionModels;