const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Counter = require("./Counter");
const { pad } = require("../utils/seq");

// Append-only receptionist replies
const ResponseSchema = new Schema(
  {
    receptionistCode: { type: String, trim: true, index: true }, // e.g., "R-0002"
    text:             { type: String, required: true, trim: true },
    at:               { type: Date, default: Date.now }
  },
  { _id: false }
);

const InquirySchema = new Schema(
  {
    patientCode: { type: String, required: true, index: true, trim: true },

    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
      index: true
    },

    assignedTo: { type: String, trim: true, index: true }, // e.g., "R-0002"

    responses: { type: [ResponseSchema], default: [] },

    inquiryCode: { type: String, unique: true, sparse: true, index: true }
  },
  { timestamps: true }
);

InquirySchema.pre("save", async function (next) {
  if (this.isNew && !this.inquiryCode) {
    const c = await Counter.findOneAndUpdate(
      { scope: "inquiry" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    this.inquiryCode = `INQ-${pad(c.seq, 4)}`;
  }
  next();
});

InquirySchema.index({ status: 1, createdAt: -1 });
InquirySchema.index({ patientCode: 1, createdAt: -1 });

module.exports = mongoose.model("InquiryModel", InquirySchema);
