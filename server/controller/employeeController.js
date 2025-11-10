const Employee = require("../model/employee");
const Department = require("../model/department");
const Designation = require("../model/designation");
const bcrypt = require("bcryptjs");

const employeeController = {
  createEmployee: async (req, res) => {
    try {
      const { name, email, password, department_id, designation_id, reporting_head_id, role, status } = req.body;

      if (!name || !email || !password || !department_id || !designation_id) {
        return res.status(400).json({ status: false, message: "All required fields must be provided" });
      }

      const existing = await Employee.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ status: false, message: "Employee already exists" });
      }

      const hashPassword = await bcrypt.hash(password, 10);
      const newEmp = await Employee.create({
        name,
        email,
        password: hashPassword,
        department_id,
        designation_id,
        reporting_head_id,
        role: role || "employee",
        status,
      });

      res.status(201).json({
        status: true,
        message: "Employee created successfully",
        data: newEmp,
      });
    } catch (err) {
      console.error("Error creating employee:", err);
      res.status(500).json({ status: false, message: err.message });
    }
  },

  // Public minimal list for registration page to populate Reporting Head
  listPublicHeads: async (req, res) => {
    try {
      const employees = await Employee.findAll({
        where: { status: true },
        attributes: ["id", "name", "email", "role"],
      });
      res.status(200).json({ status: true, message: "Fetched successfully", data: employees });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  // Employee self-service profile update (no role/status/department/designation changes)
  updateSelf: async (req, res) => {
    try {
      const auth = req.user; // set by verifyToken
      if (!auth?.id) return res.status(401).json({ status: false, message: "Unauthorized" });

      const { name, email, password } = req.body;
      const emp = await Employee.findByPk(auth.id);
      if (!emp) return res.status(404).json({ status: false, message: "Employee not found" });

      // Optional fields; do not let user change role/status/department/designation via this endpoint
      const payload = {};
      if (typeof name !== 'undefined') payload.name = name;
      if (typeof email !== 'undefined') payload.email = email;
      if (password) {
        const hashPassword = await bcrypt.hash(password, 10);
        payload.password = hashPassword;
      }

      await emp.update(payload);
      const withRels = await Employee.findByPk(auth.id, {
        include: [
          { model: Department, as: "department", attributes: ["id", "name"] },
          { model: Designation, as: "designation", attributes: ["id", "title"] },
          { model: Employee, as: "reporting_head", attributes: ["id", "name", "email"] },
        ],
      });
      res.status(200).json({ status: true, message: "Profile updated successfully", data: withRels });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getAllEmployees: async (req, res) => {
    try {
      const employees = await Employee.findAll({
        include: [
          { model: Department, as: "department", attributes: ["id", "name"] },
          { model: Designation, as: "designation", attributes: ["id", "title"] },
          { model: Employee, as: "reporting_head", attributes: ["id", "name", "email"] },
        ],
      });
      res.status(200).json({ status: true, message: "Fetched successfully", data: employees });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getEmployeeById: async (req, res) => {
    try {
      const { id } = req.params;
      const emp = await Employee.findByPk(id, {
        include: [
          { model: Department, as: "department", attributes: ["id", "name"] },
          { model: Designation, as: "designation", attributes: ["id", "title"] },
          { model: Employee, as: "reporting_head", attributes: ["id", "name", "email"] },
        ],
      });

      if (!emp) return res.status(404).json({ status: false, message: "Employee not found" });
      res.status(200).json({ status: true, message: "Employee fetched successfully", data: emp });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  updateEmployee: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, password, department_id, designation_id, reporting_head_id, role, status } = req.body;

      const emp = await Employee.findByPk(id);
      if (!emp) return res.status(404).json({ status: false, message: "Employee not found" });

      const hashPassword = password ? await bcrypt.hash(password, 10) : emp.password;

      await emp.update({ name, email, password: hashPassword, department_id, designation_id, reporting_head_id, role, status });
      res.status(200).json({ status: true, message: "Employee updated successfully", data: emp });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  deleteEmployee: async (req, res) => {
    try {
      const { id } = req.params;
      const emp = await Employee.findByPk(id);
      if (!emp) return res.status(404).json({ status: false, message: "Employee not found" });

      await emp.destroy();
      res.status(200).json({ status: true, message: "Employee deleted successfully" });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
};

module.exports = employeeController;
