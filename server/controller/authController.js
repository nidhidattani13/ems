const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Employee = require("../model/employee");
require("dotenv").config();

const authController = {
  // 🧾 Register (Admin or Employee)
  register: async (req, res) => {
    try {
      const { name, email, password, role, department_id, designation_id, reporting_head_id } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ status: false, message: "All fields are required" });
      }

      const existing = await Employee.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ status: false, message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await Employee.create({
        name,
        email,
        password: hashedPassword,
        role: role || "Employee",
        department_id,
        designation_id,
        reporting_head_id,
      });

      res.status(201).json({ status: true, message: "User registered successfully", data: user });
    } catch (err) {
      console.error("Register Error:", err);
      res.status(500).json({ status: false, message: err.message });
    }
  },

  // 🔐 Login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ status: false, message: "Email and password are required" });
      }

      const user = await Employee.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({ status: false, message: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ status: false, message: "Invalid password" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "secretkey",
        { expiresIn: "1d" }
      );

      res.status(200).json({
        status: true,
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  // ✅ Verify Token Middleware
  verifyToken: (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(403).json({ status: false, message: "No token provided" });

      jwt.verify(token, process.env.JWT_SECRET || "secretkey", (err, decoded) => {
        if (err) return res.status(401).json({ status: false, message: "Unauthorized or invalid token" });

        req.user = decoded;
        next();
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  // 🧑‍💼 Admin Only Middleware
  isAdmin: (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: false, message: "Access denied: Admins only" });
    }
    next();
  },
};

module.exports = authController;
