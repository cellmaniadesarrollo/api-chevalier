const express = require('express');
const CashMovementController = require('../Controllers/CashMovementController');
const { logged, hasRole } = require('../helpers/permissions');
const upload = require('../middlewares/upload');
const routes = express.Router();

routes.post(
    '/api/cashmovement',
    logged,
    hasRole('CASHIER', 'ADMIN'),
    upload.array('attachments', 5), // hasta 5 archivos por movimiento
    CashMovementController.create
);

routes.get(
    '/api/cashmovement/session/:sessionId',
    logged,
    hasRole('CASHIER', 'ADMIN'),
    CashMovementController.listBySession
);
routes.get(
    '/api/cashmovement/session/:sessionId',
    logged,
    hasRole('CASHIER', 'ADMIN'),
    CashMovementController.listBySession
);
routes.get(
    '/api/cashmovement/:id',
    logged,
    hasRole('CASHIER', 'ADMIN', 'SUPERVISOR'),
    CashMovementController.getById
);
module.exports = routes;