const express = require("express"); 
const DiscpuntsController=require("../Controllers/DiscountsController")
const {logged,hasRole}=require("../helpers/permissions")
const routes = express.Router();
 
routes.post("/api/listdiscounts",logged,hasRole(  'ADMIN','SUPERVISOR'), DiscpuntsController.list); 
routes.post("/api/findonediscounts",logged,hasRole(  'ADMIN','SUPERVISOR'), DiscpuntsController.find); 
routes.get("/api/getnewdatadiscounts",logged,hasRole(  'ADMIN','SUPERVISOR'), DiscpuntsController.getNewData); 
routes.post("/api/editonediscounts",logged,hasRole(  'ADMIN','SUPERVISOR'), DiscpuntsController.editNewData); 
routes.post("/api/saveonediscounts",logged,hasRole(  'ADMIN','SUPERVISOR'), DiscpuntsController.saveNewData); 

module.exports = routes; 