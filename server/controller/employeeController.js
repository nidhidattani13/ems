const Employee = require("../model/employee");
const Department = require("../model/department");
const Designation = require("../model/designation");
const Document = require('../model/document');
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
      // ensure documents is returned as parsed JSON array
      // include documents from separate table
      const empData = emp.toJSON ? emp.toJSON() : emp;
      try {
        const docs = await Document.findAll({ where: { employee_id: id }, order: [['createdAt','DESC']] });
        // return minimal doc metadata + data (base64) so UI can preview
        empData.documents = docs.map(d => ({ id: d.id, type: d.type, filename: d.filename, data: d.data, uploadedAt: d.createdAt }));
      } catch (e) {
        empData.documents = [];
      }
      res.status(200).json({ status: true, message: "Employee fetched successfully", data: empData });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  // Upload a document for an employee (owner or admin)
  uploadDocument: async (req, res) => {
    try {
      const { id } = req.params;
      const auth = req.user;
      if (!auth) return res.status(401).json({ status: false, message: 'Unauthorized' });
      if (String(auth.id) !== String(id) && auth.role !== 'admin') return res.status(403).json({ status: false, message: 'Forbidden' });

      const { file, type, filename } = req.body;
      if (!file || !type) return res.status(400).json({ status: false, message: 'File and type are required' });

      const emp = await Employee.findByPk(id);
      if (!emp) return res.status(404).json({ status: false, message: 'Employee not found' });

      // create a Document row; data is stored as LONG text (base64)
      const created = await Document.create({ employee_id: id, type, filename: filename || '', data: file });
      res.status(201).json({ status: true, message: 'Document uploaded', data: { id: created.id, type: created.type, filename: created.filename, data: created.data, uploadedAt: created.createdAt } });
    } catch (err) {
      console.error('uploadDocument error', err);
      res.status(500).json({ status: false, message: err.message });
    }
  },

  // Delete a document for an employee (owner or admin)
  deleteDocument: async (req, res) => {
    try {
      const { id, docId } = req.params;
      const auth = req.user;
      if (!auth) return res.status(401).json({ status: false, message: 'Unauthorized' });
      if (String(auth.id) !== String(id) && auth.role !== 'admin') return res.status(403).json({ status: false, message: 'Forbidden' });

      // delete from Document table
      const doc = await Document.findOne({ where: { id: docId, employee_id: id } });
      if (!doc) return res.status(404).json({ status: false, message: 'Document not found' });
      await doc.destroy();
      res.status(200).json({ status: true, message: 'Document deleted' });
    } catch (err) {
      console.error('deleteDocument error', err);
      res.status(500).json({ status: false, message: err.message });
    }
  },

  // Serve document data (return data URL) for authenticated requests
  serveDocument: async (req, res) => {
    try {
      const { id, docId } = req.params;
      const auth = req.user;
      if (!auth) return res.status(401).json({ status: false, message: 'Unauthorized' });
      // owner or admin
      if (String(auth.id) !== String(id) && auth.role !== 'admin') return res.status(403).json({ status: false, message: 'Forbidden' });

      const doc = await Document.findOne({ where: { id: docId, employee_id: id } });
      if (!doc) return res.status(404).json({ status: false, message: 'Document not found' });

      const raw = doc.data || '';
      let dataUrl = raw;
      let mime = 'application/octet-stream';
      // if stored already includes data: prefix, use it
      if (!raw.startsWith('data:')) {
        // try detect mime from filename extension
        const fn = (doc.filename || '').toLowerCase();
        if (fn.endsWith('.png')) mime = 'image/png';
        else if (fn.endsWith('.jpg') || fn.endsWith('.jpeg')) mime = 'image/jpeg';
        else if (fn.endsWith('.pdf')) mime = 'application/pdf';
        else if (fn.endsWith('.gif')) mime = 'image/gif';
        // build data URL
        dataUrl = `data:${mime};base64,${raw}`;
      } else {
        // parse mime if present
        const m = raw.match(/^data:([^;]+);/);
        if (m && m[1]) mime = m[1];
      }

      res.json({ status: true, data: dataUrl, filename: doc.filename || '', mime });
    } catch (err) {
      console.error('serveDocument error', err);
      res.status(500).json({ status: false, message: err.message });
    }
  },

  // Update a document (type, filename, or replace data)
  updateDocument: async (req, res) => {
    try {
      const { id, docId } = req.params;
      const auth = req.user;
      if (!auth) return res.status(401).json({ status: false, message: 'Unauthorized' });
      if (String(auth.id) !== String(id) && auth.role !== 'admin') return res.status(403).json({ status: false, message: 'Forbidden' });

      const { file, type, filename } = req.body;
      const doc = await Document.findOne({ where: { id: docId, employee_id: id } });
      if (!doc) return res.status(404).json({ status: false, message: 'Document not found' });

      const payload = {};
      if (typeof type !== 'undefined') payload.type = type;
      if (typeof filename !== 'undefined') payload.filename = filename;
      if (typeof file !== 'undefined' && file !== null) payload.data = file;

      await doc.update(payload);
      res.status(200).json({ status: true, message: 'Document updated', data: { id: doc.id, type: doc.type, filename: doc.filename, data: doc.data, uploadedAt: doc.updatedAt } });
    } catch (err) {
      console.error('updateDocument error', err);
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
