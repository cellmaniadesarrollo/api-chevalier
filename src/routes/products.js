const express = require("express"); 
const ProductsController=require("../Controllers/ProductsController")
const {logged,hasRole}=require("../helpers/permissions")
const routes = express.Router();

 
routes.post("/api/findproducts",logged,hasRole('CASHIER', 'ADMIN'), ProductsController.find); 


module.exports = routes;