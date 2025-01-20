const express = require("express"); 
const SalesController=require("../Controllers/SalesController")
const {logged,hasRole}=require("../helpers/permissions")
const routes = express.Router();

 
routes.get("/api/salesgetnewdata",logged,hasRole('CASHIER', 'ADMIN'), SalesController.getnewsalesdata); 
routes.post("/api/salesgetdiscount",logged,hasRole('CASHIER', 'ADMIN'), SalesController.getnewsalesdiscount); 
routes.get("/api/salesgetfinancialentitys",logged,hasRole('CASHIER', 'ADMIN'), SalesController.getfinancialentitys); 
routes.post("/api/salessave",logged,hasRole('CASHIER', 'ADMIN'), SalesController.save); 
routes.post("/api/saleslist",logged,hasRole('MANAGER','CASHIER', 'ADMIN'), SalesController.list); 
routes.post("/api/salesreport",logged,hasRole('MANAGER', 'ADMIN'), SalesController.reports); 
routes.post("/api/salesreportminimal",logged,hasRole('MANAGER', 'ADMIN'), SalesController.reportsminimal); 
routes.post("/api/salesprintticket",logged,hasRole('CASHIER', 'ADMIN'), SalesController.dataprintticket); 
routes.post("/api/salesreportgrahp",logged,hasRole('MANAGER', 'ADMIN'),  SalesController.reportgraph); 
routes.post("/api/salesreportpdfdetail",logged,hasRole('MANAGER', 'ADMIN'),  SalesController.repordetailpdf); 
routes.post("/api/salesreportpdfmedium",logged,hasRole('MANAGER', 'ADMIN'),  SalesController.reportmediumpdf); 

module.exports = routes;