const mongoose = require("mongoose");
const Patient = require("../Model/PatientModel");

// display part
const getAllPatients = async (req, res, next) => {
  try {
    const patients = await Patient.find().populate("userId", "name email role");
    if (!patients || patients.length === 0) return res.status(404).json({ message: "Patients not found" });
    return res.status(200).json({ patients });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// data insert
const addPatients = async (req, res, next) => {
  const { userId, nic, dob, gender, address, allergies } = req.body;
  try {
    const doc = new Patient({ userId, nic, dob, gender, address, allergies });
    await doc.save();
    const populated = await Patient.findById(doc._id).populate("userId", "name email role");
    return res.status(201).json({ patients: populated });
  } catch (err) {
    console.error("addPatients error:", err);
    if (err?.code === 11000) return res.status(409).json({ message: "Duplicate key", detail: err.keyValue });
    return res.status(422).json({ message: err.message || "Unable to add patient" });
  }
};

// retrieve by id (supports Mongo _id or patientCode like P-0001)
const getById = async (req, res, next) => {
  const id = req.params.id;
  try {
    let patients;
    if (mongoose.Types.ObjectId.isValid(id)) {
      patients = await Patient.findById(id).populate("userId", "name email role");
    } else {
      patients = await Patient.findOne({ patientCode: id }).populate("userId", "name email role");
    }
    if (!patients) return res.status(404).json({ message: "Patient not found" });
    return res.status(200).json({ patients });
  } catch (err) {
    console.error("getById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const getByCode = async (req, res) => {
  try {
    const { patientCode } = req.params;
    const patient = await Patient.findOne({ patientCode }).populate("userId", "name email role");
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    return res.status(200).json({ patient });
  } catch (err) {
    console.error("getByCode error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getAllPatients = getAllPatients;
exports.addPatients = addPatients;
exports.getById = getById;
exports.getByCode = getByCode;
