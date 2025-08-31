// Model/TreatmentplanHistory.js
const mongoose = require("mongoose");

const TreatmentplanHistorySchema = new mongoose.Schema({
  patientCode: String,
  dentistCode: String,
  planCode: String,
  version: Number,
  action: { type: String, enum: ["create","update","archive","restore"] },
  reason: String,
  changedBy: String,        
  changedAt: { type: Date, default: Date.now },
  snapshot: Object            
}, { timestamps: false });

module.exports = mongoose.model("TreatmentplanHistory", TreatmentplanHistorySchema);
