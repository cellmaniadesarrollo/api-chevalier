const express = require('express');
const UserController = require('../Controllers/UserController');
const { logged, hasRole } = require('../helpers/permissions');
const routes = express.Router();

routes.get('/api/user', logged, hasRole('ADMIN', 'SUPERVISOR'), UserController.list);
routes.get('/api/user/barbers', logged, hasRole('ADMIN', 'SUPERVISOR'), UserController.listBarbers);
routes.get('/api/user/:id', logged, hasRole('ADMIN', 'SUPERVISOR'), UserController.getById);
routes.put('/api/user/:id', logged, hasRole('ADMIN', 'SUPERVISOR'), UserController.update);
routes.delete('/api/user/:id', logged, hasRole('ADMIN', 'SUPERVISOR'), UserController.softDelete);
routes.patch('/api/user/:id/restore', logged, hasRole('ADMIN', 'SUPERVISOR'), UserController.restore);
routes.post('/api/user', logged, hasRole('ADMIN', 'SUPERVISOR'), UserController.create);
module.exports = routes;