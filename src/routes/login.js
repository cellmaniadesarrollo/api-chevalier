const express = require("express"); 
const UsersController=require("../Controllers/UsersController")
const {recaptchaToken}=require("../helpers/permissions")
const routes = express.Router();

routes.post("/api/login", UsersController.login); 



module.exports = routes;