const express = require("express"); 
const SuppliersController=require("../Controllers/SuppliersController")
const {logged,hasRole}=require("../helpers/permissions")
const routes = express.Router();

routes.get("/api/getnewdatasupplier",logged,hasRole('SUPERVISOR', 'ADMIN'), SuppliersController.getNewData); 
routes.post("/api/finddnisupplierexist",logged,hasRole('SUPERVISOR', 'ADMIN'), SuppliersController.findDniDupplierExist); 
routes.post("/api/savesupplier",logged,hasRole('SUPERVISOR', 'ADMIN'), SuppliersController.saveSupplier); 


module.exports = routes; 