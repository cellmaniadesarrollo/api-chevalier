const express = require("express"); 
const ProductsController=require("../Controllers/ProductsController")
const {logged,hasRole}=require("../helpers/permissions")
const routes = express.Router();

 
routes.post("/api/findproducts",logged,hasRole('CASHIER','SUPERVISOR', 'ADMIN'), ProductsController.find); 
routes.get("/api/getnewdata",logged,hasRole('SUPERVISOR', 'ADMIN'), ProductsController.getnewdata); 
routes.post("/api/saveproduct",logged,hasRole('SUPERVISOR', 'ADMIN'), ProductsController.save); 
routes.post("/api/listproducts",logged,hasRole('CASHIER','SUPERVISOR', 'ADMIN'), ProductsController.list); 
routes.get("/api/getnewdatainsert",logged,hasRole('SUPERVISOR', 'ADMIN'), ProductsController.getNewDataInsert); 
routes.post("/api/findsuppliers",logged,hasRole('SUPERVISOR', 'ADMIN'), ProductsController.findSuppliers); 
routes.post("/api/findproductincome",logged,hasRole('SUPERVISOR', 'ADMIN'), ProductsController.findProducts);
routes.post("/api/saveproductincome",logged,hasRole('SUPERVISOR', 'ADMIN'), ProductsController.saveProductsincome);
routes.post("/api/printdocumentincome",logged,hasRole('SUPERVISOR', 'ADMIN'), ProductsController.printDocumentincome);
routes.post("/api/listproductincome",logged,hasRole('SUPERVISOR', 'ADMIN'), ProductsController.listProductsincome); 
routes.post("/api/getitempintticket",logged,hasRole('SUPERVISOR', 'ADMIN'), ProductsController.getItemPrintTicket);   
routes.post("/api/findproductbanches",logged,hasRole('CASHIER','SUPERVISOR', 'ADMIN'), ProductsController.findProductBanches); 
routes.post("/api/savebarbersuppliestracker",logged,hasRole('CASHIER','SUPERVISOR', 'ADMIN'), ProductsController.saveBarberSuppliesTracker);
routes.post("/api/listbarbersuppliestracker",logged,hasRole('CASHIER','SUPERVISOR', 'ADMIN'), ProductsController.listBarberSuppliesTracker);
routes.get("/api/expidedproducts",logged, ProductsController.expiredProducts); 
module.exports = routes;