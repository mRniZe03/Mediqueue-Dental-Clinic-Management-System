const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PatientSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    nic: { type: String, required: true, unique: true, trim: true },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    address: { type: String, trim: true },
    allergies: { type: String, trim: true },
    patientCode: { type: String, unique: true, sparse: true, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PatientModel", PatientSchema, "patientmodels");
