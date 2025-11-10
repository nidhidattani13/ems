const Designation = require("../model/designation");
const Department = require("../model/department");

const designationController = {
  createDesignation: async (req, res) => {
    try {
      const { title, department_id, status } = req.body;

      if (!title || !department_id) {
        return res.status(400).json({ status: false, message: "Title and Department ID required" });
      }

      const dept = await Department.findByPk(department_id);
      if (!dept) {
        return res.status(404).json({ status: false, message: "Department not found" });
      }

      const exists = await Designation.findOne({ where: { title, department_id } });
      if (exists) {
        return res.status(409).json({ status: false, message: "Designation already exists in this department" });
      }

      const newDesig = await Designation.create({ title, department_id, status });
      res.status(201).json({ status: true, message: "Designation created successfully", data: newDesig });
    } catch (err) {
      console.error("Error creating designation:", err);
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getAllDesignations: async (req, res) => {
    try {
      const designations = await Designation.findAll({
        include: [{ model: Department, as: "department", attributes: ["id", "name"] }],
      });
      res.status(200).json({ status: true, message: "Fetched successfully", data: designations });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getByDepartmentId: async (req, res) => {
    try {
      const { department_id } = req.params;
      const designations = await Designation.findAll({
        where: { department_id },
        include: [{ model: Department, as: "department", attributes: ["id", "name"] }],
      });

      if (!designations.length) {
        return res.status(404).json({ status: false, message: "No designations found for this department" });
      }

      res.status(200).json({ status: true, message: "Fetched successfully", data: designations });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  updateDesignation: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, department_id, status } = req.body;

      const desig = await Designation.findByPk(id);
      if (!desig) {
        return res.status(404).json({ status: false, message: "Designation not found" });
      }

      if (department_id) {
        const dept = await Department.findByPk(department_id);
        if (!dept) {
          return res.status(404).json({ status: false, message: "Department not found" });
        }
      }

      await desig.update({ title, department_id, status });
      res.status(200).json({ status: true, message: "Updated successfully", data: desig });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  deleteDesignation: async (req, res) => {
    try {
      const { id } = req.params;
      const desig = await Designation.findByPk(id);
      if (!desig) {
        return res.status(404).json({ status: false, message: "Designation not found" });
      }

      await desig.destroy();
      res.status(200).json({ status: true, message: "Deleted successfully" });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getDesignationById: async (req, res) => {
    try {
      const { id } = req.params;

      const designation = await Designation.findByPk(id, {
        include: [
          {
            model: Department,
            as: "department",
            attributes: ["id", "name"],
          },
        ],
      });

      if (!designation) {
        return res.status(404).json({
          status: false,
          message: "Designation not found",
        });
      }

      res.status(200).json({
        status: true,
        message: "Designation fetched successfully",
        data: designation,
      });
    } catch (err) {
      console.error("Error fetching designation:", err);
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: err.message,
      });
    }
  },
};

module.exports = designationController;
