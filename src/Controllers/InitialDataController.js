const InitialDataController = {};
const RoleModels = require('../models/RoleModels');

// 🔹 Por ahora solo roles; si luego necesitas tipos de producto/servicio u otros
// catálogos para selects, se agregan aquí mismo.
InitialDataController.getUserFormData = async (req, res) => {
    try {
        const roles = await RoleModels.list();
        res.status(200).json({ roles });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = InitialDataController;