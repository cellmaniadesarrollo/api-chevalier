const express = require("express");
const CashSessionController = require("../Controllers/CashSessionController")
const { logged, hasRole } = require("../helpers/permissions")
const routes = express.Router();


// routes
routes.post("/api/cashsession/open", logged, hasRole('CASHIER', 'ADMIN'), CashSessionController.open);
routes.get("/api/cashsession/status", logged, CashSessionController.status);
routes.post("/api/cashsession/close", logged, hasRole('CASHIER', 'ADMIN'), CashSessionController.close);
routes.get("/api/cashsession/opening-preview", logged, hasRole('CASHIER', 'ADMIN'), CashSessionController.openingPreview);
routes.get("/api/cashsession/list", logged, hasRole('ADMIN', 'CASHIER'), CashSessionController.list);
module.exports = routes;