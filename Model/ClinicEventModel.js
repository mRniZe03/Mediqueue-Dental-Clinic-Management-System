const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Counter = require("./Counter");   // 👈 import counter

const ClinicEventSchema = new Schema({
  eventCode:   { type: String, unique: true, sparse: true, index: true, trim: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  startDate:   { type: Date, required: true, index: true },
  endDate:     { type: Date, required: true, index: true },
  allDay:      { type: Boolean, default: true },
  eventType: {
    type: String,
    enum: ["Holiday","Closure","Maintenance","Meeting","Other"],
    default: "Other",
    index: true
  },
  isPublished: { type: Boolean, default: false, index: true },
  imageUrl:    { type: String, trim: true },   // 👈 added field for event image
  createdBy:   { type: Schema.Types.ObjectId, ref: "User", required: false },
  updatedBy:   { type: Schema.Types.ObjectId, ref: "User", required: false }
}, { timestamps: true });

// Validation: endDate must not be earlier than startDate
ClinicEventSchema.pre("validate", function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error("endDate cannot be earlier than startDate"));
  }
  next();
});

// Auto-generate eventCode before saving
ClinicEventSchema.pre("save", async function (next) {
  if (this.isNew && !this.eventCode) {
    try {
      // Increment counter for clinic events
      const counter = await Counter.findOneAndUpdate(
        { scope: "clinicEvent" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      // Pad the sequence with leading zeros (e.g. 1 -> 0001)
      const padded = String(counter.seq).padStart(4, "0");

      // Format: EV-0001, EV-0002, etc.
      this.eventCode = `EV-${padded}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Useful indexes
ClinicEventSchema.index({ startDate: 1, endDate: 1 });
ClinicEventSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("ClinicEvent", ClinicEventSchema);
