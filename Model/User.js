const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 150, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    contact_no: { type: String, trim: true },
    role: { type: String, enum: ["Patient", "Dentist", "Receptionist", "Manager", "Admin"], required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model("User", UserSchema);
