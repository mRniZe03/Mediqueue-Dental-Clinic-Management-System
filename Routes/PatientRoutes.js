const express = require("express");
const router = express.Router();
const PatientController = require("../Controllers/PatientControllers");

router.get("/", PatientController.getAllPatients);
router.post("/", PatientController.addPatients);

// attach user (allow both PUT and PATCH)
router.put("/code/:patientCode/attach-user", PatientController.attachUserByCode);
router.patch("/code/:patientCode/attach-user", PatientController.attachUserByCode);

router.put("/:id/attach-user", PatientController.attachUserById);
router.patch("/:id/attach-user", PatientController.attachUserById);

// fetch/update/delete
router.get("/code/:patientCode", PatientController.getByCode);
router.get("/:id", PatientController.getById);
router.put("/:id", PatientController.updatePatient);
router.patch("/:id", PatientController.updatePatient);
router.delete("/:id", PatientController.deletePatient);

module.exports = router;
