// Model/TreatmentplanModel.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Counter = require("./Counter");          // required for per-patient counters
const { pad } = require("../utils/seq");       // left-pad helper for codes like 001

const TreatmentplanSchema = new Schema(
  {
    patientCode: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    dentistCode: {
      type: String,
      required: true,
      trim: true,
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    treatment_notes: {
      type: String,
      trim: true,
    },

    // business timestamps (you already use these)
    created_date: { type: Date, default: Date.now },
    updated_date: { type: Date, default: Date.now },

    // optimistic revision number (auto-increments on updates)
    version: { type: Number, default: 1 },

    // sequential code per patient (e.g., TP-001, TP-002 ...)
    planCode: { type: String },

    /* ------------------------- soft-delete / archive ------------------------- */
    isDeleted: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },     // or Schema.Types.ObjectId if you track user ids
    deleteReason: { type: String, default: null },
  },
  {
    // you maintain created_date / updated_date yourself
    timestamps: false,
    // leave strict on (default) so unknown fields are not stored
  }
);

/* -------------------------- indexes / uniqueness -------------------------- */
// Ensure planCode is unique **within** a patient
TreatmentplanSchema.index({ patientCode: 1, planCode: 1 }, { unique: true });

/* -------------------------- planCode auto-generation -------------------------- */
TreatmentplanSchema.pre("save", async function (next) {
  try {
    this.updated_date = new Date();

    // Only generate when creating a new doc and planCode not set
    if (this.isNew && !this.planCode) {
      const scope = `tplan:${this.patientCode}`; // per-patient counter scope
      const c = await Counter.findOneAndUpdate(
        { scope },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
      );
      this.planCode = `TP-${pad(c.seq, 3)}`; // e.g., TP-001
    }

    next();
  } catch (err) {
    next(err);
  }
});

/* ------------------- version bump + updated_date on updates ------------------- */
function bumpVersion(update) {
  const u = update || {};

  // always increment version atomically
  u.$inc = u.$inc || {};
  u.$inc.version = (u.$inc.version || 0) + 1;

  // keep updated_date fresh
  u.$set = u.$set || {};
  u.$set.updated_date = new Date();

  // protect planCode from being changed via query updates
  if (u.$set && "planCode" in u.$set) delete u.$set.planCode;
  if (u.$unset && "planCode" in u.$unset) delete u.$unset.planCode;
  if (u.$rename && "planCode" in u.$rename) delete u.$rename.planCode;

  return u;
}

function preQueryUpdate(next) {
  this.setUpdate(bumpVersion(this.getUpdate()));
  next();
}

TreatmentplanSchema.pre("findOneAndUpdate", preQueryUpdate);
TreatmentplanSchema.pre("findByIdAndUpdate", preQueryUpdate);
TreatmentplanSchema.pre("updateOne", preQueryUpdate);

/* --------------------------------- export --------------------------------- */
module.exports = mongoose.model("Treatmentplan", TreatmentplanSchema);
