const mongoose = require("mongoose");
const Patient = require("../Model/PatientModel");
const User = require("../Model/User");

const getAllPatients = async (_req, res) => {
  try {
    const patients = await Patient.find()
      .populate({ path: "userId", select: "name email contact_no role isActive" })
      .lean();
    return res.status(200).json({ patients });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const addPatients = async (req, res) => {
  try {
    const { userId, nic, dob, gender, address, allergies, patientCode } = req.body;
    if (!userId || !mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "Valid userId is required" });
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const patient = await Patient.create({ userId, nic, dob, gender, address, allergies, patientCode });
    const withUser = await Patient.findById(patient._id)
      .populate({ path: "userId", select: "name email contact_no role isActive" })
      .lean();
    return res.status(201).json({ patient: withUser });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const getById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id" });
    const patient = await Patient.findById(req.params.id)
      .populate({ path: "userId", select: "name email contact_no role isActive" })
      .lean();
    if (!patient) return res.status(404).json({ message: "Patient is not found" });
    return res.status(200).json({ patient });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const getByCode = async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientCode: req.params.patientCode })
      .populate({ path: "userId", select: "name email contact_no role isActive" })
      .lean();
    if (!patient) return res.status(404).json({ message: "Patient is not found" });
    return res.status(200).json({ patient });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const updatePatient = async (req, res) => {
  try {
    const updates = (({ nic, dob, gender, address, allergies, patientCode }) => ({ nic, dob, gender, address, allergies, patientCode }))(req.body);
    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);
    const updated = await Patient.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true })
      .populate({ path: "userId", select: "name email contact_no role isActive" })
      .lean();
    if (!updated) return res.status(404).json({ message: "Patient is not found" });
    return res.status(200).json({ patient: updated });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const deletePatient = async (req, res) => {
  try {
    const r = await Patient.findByIdAndDelete(req.params.id).lean();
    if (!r) return res.status(404).json({ message: "Patient is not found" });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const attachUserById = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || !mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "Valid userId is required" });
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const updated = await Patient.findByIdAndUpdate(req.params.id, { $set: { userId } }, { new: true })
      .populate({ path: "userId", select: "name email contact_no role isActive" })
      .lean();
    if (!updated) return res.status(404).json({ message: "Patient is not found" });
    return res.status(200).json({ patient: updated });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const attachUserByCode = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId || !mongoose.isValidObjectId(userId)) return res.status(400).json({ message: "Valid userId is required" });
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    const updated = await Patient.findOneAndUpdate({ patientCode: req.params.patientCode }, { $set: { userId } }, { new: true })
      .populate({ path: "userId", select: "name email contact_no role isActive" })
      .lean();
    if (!updated) return res.status(404).json({ message: "Patient is not found" });
    return res.status(200).json({ patient: updated });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getAllPatients,
  addPatients,
  getById,
  getByCode,
  updatePatient,
  deletePatient,
  attachUserById,
  attachUserByCode
};
