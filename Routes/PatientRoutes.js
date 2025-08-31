const express = require("express");
const Patient_router = express.Router();
const PatientController = require("../Controllers/PatientControllers");

Patient_router.get("/", PatientController.getAllPatients);
Patient_router.post("/", PatientController.addPatients);

Patient_router.get("/code/:patientCode", PatientController.getByCode);
Patient_router.get("/Code/:patientCode", PatientController.getByCode); // optional alias

Patient_router.get("/:id", PatientController.getById);

module.exports = Patient_router;
