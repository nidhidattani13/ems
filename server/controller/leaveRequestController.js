const LeaveRequest = require("../model/leaveRequest");
const Employee = require("../model/employee");
const LeaveType = require("../model/leaveType");

const leaveRequestController = {
  createRequest: async (req, res) => {
    try {
      const { employee_id, leave_type_id, start_date, end_date, is_half_day, half_day_session, status } = req.body;

      if (!employee_id || !leave_type_id || !start_date || !end_date) {
        return res.status(400).json({ status: false, message: "Required fields missing" });
      }

      const hasSessionColumn = !!(LeaveRequest?.rawAttributes && LeaveRequest.rawAttributes.half_day_session);
      if (is_half_day && hasSessionColumn && !half_day_session) {
        return res.status(400).json({ status: false, message: "half_day_session is required for half-day leave (Morning/Evening)" });
      }

      const createPayload = {
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        is_half_day,
        status,
      };
      if (hasSessionColumn && is_half_day && half_day_session) {
        createPayload.half_day_session = half_day_session;
      }

      const leaveRequest = await LeaveRequest.create(createPayload);

      res.status(201).json({
        status: true,
        message: "Leave request submitted successfully",
        data: leaveRequest,
      });
    } catch (err) {
      console.error("Error creating leave request:", err);
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getAllRequests: async (req, res) => {
    try {
      const requests = await LeaveRequest.findAll({
        include: [
          { model: Employee, as: "employee", attributes: ["id", "name", "email"] },
          { model: LeaveType, as: "leaveType", attributes: ["id", "name", "is_paid"] },
          { model: Employee, as: "approver", attributes: ["id", "name"] },
        ],
      });
      res.status(200).json({ status: true, message: "Leave requests fetched", data: requests });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  // Fetch leave requests for employees whose reporting head is the logged-in user
  getTeamRequests: async (req, res) => {
    try {
      const auth = req.user;
      if (!auth?.id) return res.status(401).json({ status: false, message: "Unauthorized" });

      const requests = await LeaveRequest.findAll({
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: ["id", "name", "email", "reporting_head_id"],
            where: { reporting_head_id: auth.id },
          },
          { model: LeaveType, as: "leaveType", attributes: ["id", "name", "is_paid"] },
          { model: Employee, as: "approver", attributes: ["id", "name"] },
        ],
      });

      res.status(200).json({ status: true, message: "Team leave requests fetched", data: requests });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const request = await LeaveRequest.findByPk(id, {
        include: [
          { model: Employee, as: "employee", attributes: ["id", "name", "email"] },
          { model: LeaveType, as: "leaveType", attributes: ["id", "name"] },
          { model: Employee, as: "approver", attributes: ["id", "name"] },
        ],
      });

      if (!request) {
        return res.status(404).json({ status: false, message: "Leave request not found" });
      }

      res.status(200).json({ status: true, message: "Leave request fetched", data: request });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  updateRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const { leave_status, approved_by, start_date, end_date, is_half_day, status, leave_type_id, half_day_session } = req.body;

      const request = await LeaveRequest.findByPk(id);
      if (!request) {
        return res.status(404).json({ status: false, message: "Leave request not found" });
      }

      const hasSessionColumn = !!(LeaveRequest?.rawAttributes && LeaveRequest.rawAttributes.half_day_session);

      const updatePayload = {
        leave_status,
        approved_by,
        start_date,
        end_date,
        is_half_day,
        status,
      };
      if (typeof leave_type_id !== 'undefined') {
        updatePayload.leave_type_id = leave_type_id;
      }
      if (hasSessionColumn) {
        if (is_half_day && !half_day_session) {
          return res.status(400).json({ status: false, message: "half_day_session is required for half-day leave (Morning/Evening)" });
        }
        if (typeof half_day_session !== 'undefined') {
          updatePayload.half_day_session = half_day_session || null;
        }
      }

      await request.update(updatePayload);

      res.status(200).json({ status: true, message: "Leave request updated successfully", data: request });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  deleteRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const request = await LeaveRequest.findByPk(id);

      if (!request) {
        return res.status(404).json({ status: false, message: "Leave request not found" });
      }

      await request.destroy();
      res.status(200).json({ status: true, message: "Leave request deleted successfully" });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
};

module.exports = leaveRequestController;
