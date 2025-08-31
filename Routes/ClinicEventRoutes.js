// Routes/ClinicEventRoutes.js
const express = require("express");
const router = express.Router();

const ClinicEventController = require("../Controllers/ClinicEventControllers");

// LIST + CREATE
router.get("/",     ClinicEventController.getAllEvents);
router.post("/",    ClinicEventController.addEvent);

// READ by ID and by eventCode
router.get("/:id",        ClinicEventController.getById);
router.get("/code/:eventCode", ClinicEventController.getByCode); // 👈 new

// UPDATE + DELETE
router.put("/:id",    ClinicEventController.updateEvent);
router.delete("/:id", ClinicEventController.deleteEvent);

// Extra actions
router.patch("/:id/publish",   ClinicEventController.publishEvent);
router.patch("/:id/unpublish", ClinicEventController.unpublishEvent);

module.exports = router;
