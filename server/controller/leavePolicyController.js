const LeavePolicy = require("../model/leavePolicy");
const Designation = require("../model/designation");
const LeaveType = require("../model/leaveType");

const leavePolicyController = {
  createPolicy: async (req, res) => {
    try {
      const { designation_id, leave_type_id, year_limit, months_limit, status } = req.body;

      if (!designation_id || !leave_type_id) {
        return res.status(400).json({ status: false, message: "Designation ID and Leave Type ID are required" });
      }

      const exists = await LeavePolicy.findOne({
        where: { designation_id, leave_type_id },
      });

      if (exists) {
        return res.status(409).json({ status: false, message: "Leave policy already exists for this designation and leave type" });
      }

      const policy = await LeavePolicy.create({
        designation_id,
        leave_type_id,
        year_limit,
        months_limit,
        status,
      });

      res.status(201).json({
        status: true,
        message: "Leave Policy created successfully",
        data: policy,
      });
    } catch (err) {
      console.error("Error creating policy:", err);
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getAllPolicies: async (req, res) => {
    try {
      const policies = await LeavePolicy.findAll({
        include: [
          { model: Designation, as: "designation", attributes: ["id", "title"] },
          { model: LeaveType, as: "leaveType", attributes: ["id", "name", "is_paid"] },
        ],
      });
      res.status(200).json({ status: true, message: "Policies fetched successfully", data: policies });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getPolicyById: async (req, res) => {
    try {
      const { id } = req.params;
      const policy = await LeavePolicy.findByPk(id, {
        include: [
          { model: Designation, as: "designation", attributes: ["id", "title"] },
          { model: LeaveType, as: "leaveType", attributes: ["id", "name", "is_paid"] },
        ],
      });

      if (!policy) {
        return res.status(404).json({ status: false, message: "Leave Policy not found" });
      }

      res.status(200).json({ status: true, message: "Policy fetched successfully", data: policy });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  updatePolicy: async (req, res) => {
    try {
      const { id } = req.params;
      const { designation_id, leave_type_id, year_limit, months_limit, status } = req.body;

      const policy = await LeavePolicy.findByPk(id);
      if (!policy) {
        return res.status(404).json({ status: false, message: "Leave Policy not found" });
      }

      await policy.update({ designation_id, leave_type_id, year_limit, months_limit, status });

      res.status(200).json({ status: true, message: "Policy updated successfully", data: policy });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  deletePolicy: async (req, res) => {
    try {
      const { id } = req.params;
      const policy = await LeavePolicy.findByPk(id);

      if (!policy) {
        return res.status(404).json({ status: false, message: "Leave Policy not found" });
      }

      await policy.destroy();
      res.status(200).json({ status: true, message: "Policy deleted successfully" });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
};

module.exports = leavePolicyController;
