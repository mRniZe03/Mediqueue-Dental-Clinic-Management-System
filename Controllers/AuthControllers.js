// Controllers/AuthControllers.js
const bcrypt = require("bcryptjs");               // make sure: npm i bcryptjs
const User = require("../Model/User");            // folder is "Model", file is "User.js"
const Patient = require("../Model/PatientModel"); // folder is "Model", file is "PatientModel.js"

// POST /auth/register/patient
async function registerPatient(req, res) {
  try {
    const {
      name,
      email,
      password,
      contact_no
      // ...any other fields you expect
    } = req.body;

    // basic checks
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const hash = await bcrypt.hash(password, 10);

    // create base user
    const user = await User.create({
      name,
      email,
      password: hash,
      contact_no,
      role: "Patient",
      isActive: true
    });

    // create patient profile (adjust fields to your schema)
    const patient = await Patient.create({
      userId: user._id,
      name: user.name,
      email: user.email,
      contact_no: user.contact_no
      // ...other patient fields
    });

    return res.status(201).json({ message: "Patient registered", user, patient });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}

// (Optional) POST /auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // TODO: sign and return JWT if you’re using tokens
    return res.json({ message: "Login ok", user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}

module.exports = {
  registerPatient,
  login, // remove this export if you don’t implement login
};
