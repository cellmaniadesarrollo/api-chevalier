const express = require("express"); 
const ClientsController=require("../Controllers/ClientsController")
const {logged,hasRole}=require("../helpers/permissions")
const routes = express.Router();

routes.post("/api/saveclients",logged,hasRole('CASHIER', 'ADMIN'), ClientsController.save); 
routes.post("/api/findclients",logged,hasRole('CASHIER', 'ADMIN'), ClientsController.find); 


module.exports = routes;