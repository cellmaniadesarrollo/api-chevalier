const express = require('express');
const UserCommissionController = require('../Controllers/UserCommissionController');
const { logged, hasRole } = require('../helpers/permissions');
const routes = express.Router();

routes.get(
    '/api/usercommission/user/:userId',
    logged,
    hasRole('ADMIN', 'SUPERVISOR'),
    UserCommissionController.listByUser
);
routes.post('/api/usercommission', logged, hasRole('ADMIN', 'SUPERVISOR'), UserCommissionController.create);
routes.put('/api/usercommission/:id', logged, hasRole('ADMIN', 'SUPERVISOR'), UserCommissionController.update);
routes.delete('/api/usercommission/:id', logged, hasRole('ADMIN', 'SUPERVISOR'), UserCommissionController.remove);

module.exports = routes;