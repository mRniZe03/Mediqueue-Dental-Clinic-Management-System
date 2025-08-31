
const express = require("express");
const auth_router = express.Router();

// IMPORTANT: matches your file name "AuthControllers.js" (plural) and capitalized folder "Controllers"
const Auth = require("../Controllers/AuthControllers");

// Routes
auth_router.post("/register/patient", Auth.registerPatient);
auth_router.post("/login", Auth.login); // keep only if you have a login handler

module.exports = auth_router;
