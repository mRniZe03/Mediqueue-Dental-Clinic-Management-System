const express = require("express");
const treatmentplan_router =express.Router();
//insert model
const Treatmentplan = require("../Model/TreatmentplanModel");
//insert controller
const TreatmentplanController = require("../Controllers/TreatmentplanControllers");

treatmentplan_router.get("/",TreatmentplanController.getAllTreatmentplans);
treatmentplan_router.post("/",TreatmentplanController.addTreatmentplans);
treatmentplan_router.get("/code/:planCode",TreatmentplanController.getByCode);  
treatmentplan_router.get("/:id",TreatmentplanController.getById);
treatmentplan_router.put("/code/:patientCode/:planCode",TreatmentplanController.updateTreatmentplanByCode);
treatmentplan_router.put("/:id",TreatmentplanController.updateTreatmentplanByCode);
treatmentplan_router.delete("/code/:patientCode/:planCode",TreatmentplanController .deleteTreatmentplanByCode); 
treatmentplan_router.post("/restore/:patientCode/:planCode", TreatmentplanController .restoreByCode);
treatmentplan_router.get("/counter/:patientCode", TreatmentplanController.getCounterForPatient);
treatmentplan_router.post("/counter/:patientCode/resync", TreatmentplanController.resyncCounterForPatient);

 // <-- use this
//exportdeleteTreatmentplanByCode
module.exports = treatmentplan_router;