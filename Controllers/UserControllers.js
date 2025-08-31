const mongoose = require("mongoose");
const User = require("../Model/User");

const createUser = async (req, res) => {
  try {
    const { name, email, password, contact_no, role, isActive } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ message: "name, email, password, role required" });
    const exists = await User.findOne({ email }).lean();
    if (exists) return res.status(409).json({ message: "Email already exists" });
    const user = await User.create({ name, email, password, contact_no, role, isActive });
    const safe = await User.findById(user._id).select("name email contact_no role isActive createdAt updatedAt").lean();
    return res.status(201).json({ user: safe });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().select("name email contact_no role isActive createdAt updatedAt").lean();
    return res.status(200).json({ users });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id" });
    const user = await User.findById(req.params.id).select("name email contact_no role isActive createdAt updatedAt").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ user });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const updates = (({ name, email, contact_no, role, isActive, password }) => ({ name, email, contact_no, role, isActive, password }))(req.body);
    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);
    const updated = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true })
      .select("name email contact_no role isActive createdAt updatedAt")
      .lean();
    if (!updated) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ user: updated });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const r = await User.findByIdAndDelete(req.params.id).lean();
    if (!r) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createUser, getAllUsers, getUserById, updateUser, deleteUser };
