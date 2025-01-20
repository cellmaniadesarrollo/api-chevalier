const express = require("express"); 
const AppController = require("../Controllers/AppController");
const {recaptchaToken}=require("../helpers/permissions")
const routes = express.Router();

routes.get("/", AppController.index);
routes.get("/scrape-tiktok", AppController.ticktock);
routes.get("/datavideos", AppController.tdata);
routes.get("/scrape-facebook", AppController.facebook);

routes.post("/submit-feedback",recaptchaToken, AppController.sendemail);
module.exports = routes;