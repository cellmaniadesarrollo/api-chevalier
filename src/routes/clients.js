const express = require("express"); 
const ClientsController=require("../Controllers/ClientsController")
const {logged,hasRole}=require("../helpers/permissions")
const routes = express.Router();
const {recaptchaToken}=require("../helpers/permissions")

routes.post("/api/saveclients",logged,hasRole('CASHIER', 'ADMIN','SUPERVISOR'), ClientsController.save); 
routes.post("/api/findclients",logged,hasRole('CASHIER', 'ADMIN','SUPERVISOR'), ClientsController.find); 
routes.post("/api/listclients",logged,hasRole('CASHIER', 'ADMIN','SUPERVISOR'), ClientsController.list); 
routes.post("/api/findoneclient",logged,hasRole('CASHIER', 'ADMIN','SUPERVISOR'), ClientsController.findoneclient); 
routes.post("/api/editoneclient",logged,hasRole('CASHIER', 'ADMIN','SUPERVISOR'), ClientsController.editOneclient); 


routes.post("/api/saveclientspublic", ClientsController.save); 
routes.post("/api/findclientspublic", ClientsController.find); 
module.exports = routes; 