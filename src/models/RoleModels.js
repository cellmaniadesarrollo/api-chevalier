const RoleModels = {};
const Role = require('../db/roles');

RoleModels.list = async () => Role.find().select('name').sort({ name: 1 });

module.exports = RoleModels;