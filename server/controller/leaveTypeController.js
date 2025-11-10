const LeaveType = require("../model/leaveType");

const leaveTypeController = {
  createLeaveType: async (req, res) => {
    try {
      const { name, is_paid, status } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ status: false, message: "Leave type name is required" });
      }

      const exists = await LeaveType.findOne({ where: { name } });
      if (exists) {
        return res.status(409).json({ status: false, message: "Leave type already exists" });
      }

      const leaveType = await LeaveType.create({ name, is_paid, status });
      res.status(201).json({
        status: true,
        message: "Leave type created successfully",
        data: leaveType,
      });
    } catch (err) {
      console.error("Error creating leave type:", err);
      res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  },

  getAllLeaveTypes: async (req, res) => {
    try {
      const leaveTypes = await LeaveType.findAll();
      res.status(200).json({
        status: true,
        message: "Leave types fetched successfully",
        data: leaveTypes,
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getLeaveTypeById: async (req, res) => {
    try {
      const { id } = req.params;
      const leaveType = await LeaveType.findByPk(id);

      if (!leaveType) {
        return res.status(404).json({ status: false, message: "Leave type not found" });
      }

      res.status(200).json({
        status: true,
        message: "Leave type fetched successfully",
        data: leaveType,
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  updateLeaveType: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, is_paid, status } = req.body;

      const leaveType = await LeaveType.findByPk(id);
      if (!leaveType) {
        return res.status(404).json({ status: false, message: "Leave type not found" });
      }

      await leaveType.update({ name, is_paid, status });
      res.status(200).json({
        status: true,
        message: "Leave type updated successfully",
        data: leaveType,
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  deleteLeaveType: async (req, res) => {
    try {
      const { id } = req.params;
      const leaveType = await LeaveType.findByPk(id);

      if (!leaveType) {
        return res.status(404).json({ status: false, message: "Leave type not found" });
      }

      await leaveType.destroy();
      res.status(200).json({
        status: true,
        message: "Leave type deleted successfully",
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
};

module.exports = leaveTypeController;
