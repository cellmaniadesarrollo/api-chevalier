const express = require('express');
const InitialDataController = require('../Controllers/InitialDataController');
const { logged, hasRole } = require('../helpers/permissions');
const routes = express.Router();

routes.get(
    '/api/initialdata/users',
    logged,
    hasRole('ADMIN', 'SUPERVISOR'),
    InitialDataController.getUserFormData
);

module.exports = routes;