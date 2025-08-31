const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Counter = require("./Counter");
const { pad } = require("../utils/seq");

const PatientSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  nic: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  dob: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    required: true
  },
  address: {
    type: String,
    trim: true
  },
  allergies: {
    type: String,
    trim: true
  },
  patientCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true 
  }
}, { timestamps: true });
PatientSchema.pre("save", async function (next) {
  if (this.isNew && !this.patientCode) {
    const c = await Counter.findOneAndUpdate(
      { scope: "patient" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    this.patientCode = `P-${pad(c.seq, 4)}`;
  }
  next();
});


module.exports = mongoose.model(
  "PatientModel",   
  PatientSchema    
);