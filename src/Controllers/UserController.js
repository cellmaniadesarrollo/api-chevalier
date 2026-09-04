const UserController = {};
const UserModels = require('../models/UserModels');

UserController.list = async (req, res) => {
    try {
        const result = await UserModels.list(req.query);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message, code: error.code || null });
    }
};

// 🔹 GET /api/user/barbers?status=active|deleted|all&search=&page=&limit=
UserController.listBarbers = async (req, res) => {
    try {
        const result = await UserModels.listByRoleName('HAIRDRESSER', req.query); // ajusta el nombre del rol
        res.status(200).json(result);
    } catch (error) {
        const status = error.code === 'ROLE_NOT_FOUND' ? 404 : 500;
        res.status(status).json({ message: error.message, code: error.code || null });
    }
};

UserController.getById = async (req, res) => {
    try {
        const user = await UserModels.getById(req.params.id);
        res.status(200).json(user);
    } catch (error) {
        const status = error.code === 'USER_NOT_FOUND' ? 404 : 500;
        res.status(status).json({ message: error.message, code: error.code || null });
    }
};

UserController.update = async (req, res) => {
    try {
        const user = await UserModels.update(req.params.id, req.body);
        res.status(200).json(user);
    } catch (error) {
        const status = error.code === 'USER_NOT_FOUND' ? 404 : 400;
        res.status(status).json({ message: error.message, code: error.code || null });
    }
};

UserController.softDelete = async (req, res) => {
    try {
        const user = await UserModels.softDelete(req.params.id);
        res.status(200).json(user);
    } catch (error) {
        const status = error.code === 'USER_NOT_FOUND' ? 404 : 400;
        res.status(status).json({ message: error.message, code: error.code || null });
    }
};

UserController.restore = async (req, res) => {
    try {
        const user = await UserModels.restore(req.params.id);
        res.status(200).json(user);
    } catch (error) {
        const status = error.code === 'USER_NOT_FOUND' ? 404 : 400;
        res.status(status).json({ message: error.message, code: error.code || null });
    }
};
UserController.create = async (req, res) => {
    try {
        const user = await UserModels.create(req.body);
        res.status(201).json(user);
    } catch (error) {
        const status = ['USER_USERNAME_TAKEN', 'PERSONALDATA_DNI_TAKEN'].includes(error.code) ? 409 : 400;
        res.status(status).json({ message: error.message, code: error.code || null });
    }
};
module.exports = UserController;