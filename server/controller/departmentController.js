const Department = require("../model/department");
const sequelize = require("../config/db");
const departmentController = {
    createDept: async (req, res) => {
    try {
      const { name, status } = req.body;

      if (!name) {
        return res.status(400).json({ status: false, message: "Name required" });
      }

      const existing = await Department.findOne({ where: { name } });
      if (existing) {
        return res
          .status(409)
          .json({ status: false, message: "Department already exists" });
      }

      const dept = await Department.create({ name, status });
      res.status(201).json({
        status: true,
        message: "Department created successfully",
        data: dept,
      });
    } catch (err) {
      console.error("Error creating department:", err);
      res.status(500).json({ status: false, message: "Internal server error" });
    }
  },
  getallDept: async (req, res) => {
    try {
      const department = await Department.findAll();

      res.status(200).json({ status:" ok", message: "Data Fetched", data: department });
    } catch (err) {
      res.status(500).json({ status: false, message: err });
    }
  },

  getdeptbyid: async (req, res) => {
    try {
      const { id } = req.params;
      const department = await Department.findByPk(id);
      if (!department) {
        return res
          .status(404)
          .json({ status: false, messege: "Department Not Found!!!" });
      }
      res.status(200).json({ status: "ok", data: department });
    } catch (err) {
      res.status(500).json({ status: false, messege: err });
    }
  },

  deletedept: async (req, res) => {
    try {
      const { id } = req.params;
      const department = await Department.findByPk(id);
      if (!department) {
        return res
          .status(404)
          .json({ status: false, messege: "Department Not Found!!!" });
      }
      await department.destroy();
      res
        .status(200)
        .json({ status: "ok", messege: "Department Deleted Successfully" });
    } catch (err) {
      res.status(500).json({ status: false, messege: err });
    }
  },

  updateDept: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, status } = req.body;
      const department = await Department.findByPk(id);
      if (!department) {
        return res
          .status(404)
          .json({ status: false, messege: "Department Not Found!!!" });
      }
      await department.update({ name, status });
      res
        .status(200)
        .json({ status: "ok", messege: "Department Updated Successfully" });
    } catch (err) {
      res.status(500).json({ status: false, messege: err });
    }
  },
};

module.exports = departmentController;
