const Attendance = require("../model/attendance");
const Employee = require("../model/employee");
const Department = require("../model/department");
const Designation = require("../model/designation");
const LeaveRequest = require("../model/leaveRequest");
const { Op } = require("sequelize");

const attendanceController = {
  createAttendance: async (req, res) => {
    try {
      const { employee_id, date, sign_in_time, sign_out_time, status } = req.body;

      if (!employee_id || !date) {
        return res.status(400).json({
          status: false,
          message: "Employee ID and Date are required",
        });
      }

      const employeeExists = await Employee.findByPk(employee_id);
      if (!employeeExists) {
        return res.status(404).json({
          status: false,
          message: "Employee not found",
        });
      }

      const formattedSignIn = sign_in_time ? new Date(`${date}T${sign_in_time}`) : null;
      const formattedSignOut = sign_out_time ? new Date(`${date}T${sign_out_time}`) : null;

      const newAttendance = await Attendance.create({
        employee_id,
        date,
        sign_in_time: formattedSignIn,
        sign_out_time: formattedSignOut,
        status,
      });

      res.status(201).json({
        status: true,
        message: "Attendance record created successfully",
        data: newAttendance,
      });
    } catch (err) {
      console.error("Error creating attendance:", err);
      res.status(500).json({ status: false, message: err.message });
    }
  },

  signInToday: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ status: false, message: 'Unauthorized' });

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      console.log('[ATTENDANCE] sign-in attempt', { userId, todayStr });
      // Block sign-in if user has an approved full-day leave today
      const leave = await LeaveRequest.findOne({
        where: {
          employee_id: userId,
          leave_status: 'Approved',
          status: true,
          start_date: { [Op.lte]: todayStr },
          end_date: { [Op.gte]: todayStr },
        },
      });
      if (leave && !leave.is_half_day) {
        return res.status(400).json({ status: false, message: 'You are on approved leave today. Attendance sign-in is disabled.' });
      }
      let record = await Attendance.findOne({ where: { employee_id: userId, date: todayStr } });
      if (!record) {
        // If signing in after 18:00, also set sign_out_time to 18:00
        const workEnd = new Date(`${todayStr}T18:00:00`);
        const createPayload = {
          employee_id: userId,
          date: todayStr,
          sign_in_time: now,
          status: true,
        };
        if (!isNaN(workEnd) && now >= workEnd) {
          createPayload.sign_out_time = workEnd;
        }
        record = await Attendance.create(createPayload);
        const fresh = await Attendance.findByPk(record.id);
        return res.status(201).json({ status: true, message: 'Signed in', data: fresh });
      }

      if (record.sign_in_time) {
        // If already signed in and past 18:00 without sign-out, auto sign-off
        const workEnd = new Date(`${todayStr}T18:00:00`);
        if (!record.sign_out_time && !isNaN(workEnd) && now >= workEnd) {
          await record.update({ sign_out_time: workEnd });
        }
        const fresh = await Attendance.findByPk(record.id);
        return res.status(200).json({ status: true, message: 'Already signed in', data: fresh });
      }

      await record.update({ sign_in_time: now, status: true });
      // If signing in after 18:00, also set sign_out_time to 18:00
      const workEnd = new Date(`${todayStr}T18:00:00`);
      if (!record.sign_out_time && !isNaN(workEnd) && now >= workEnd) {
        await record.update({ sign_out_time: workEnd });
      }
      const fresh = await Attendance.findByPk(record.id);
      return res.status(200).json({ status: true, message: 'Signed in', data: fresh });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  signOutToday: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ status: false, message: 'Unauthorized' });

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      console.log('[ATTENDANCE] sign-out attempt', { userId, todayStr });
      const record = await Attendance.findOne({ where: { employee_id: userId, date: todayStr } });
      if (!record) {
        return res.status(400).json({ status: false, message: 'You must sign in before signing out' });
      }
      if (record.sign_out_time) {
        const fresh = await Attendance.findByPk(record.id);
        return res.status(200).json({ status: true, message: 'Already signed out', data: fresh });
      }

      // Cap sign-out time to 18:00 local for fixed schedule
      const workEnd = new Date(`${todayStr}T18:00:00`);
      const signOutAt = (!isNaN(workEnd) && now >= workEnd) ? workEnd : now;
      await record.update({ sign_out_time: signOutAt });
      const fresh = await Attendance.findByPk(record.id);
      return res.status(200).json({ status: true, message: 'Signed out', data: fresh });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getAllAttendance: async (req, res) => {
    try {
      const { month, year } = req.query;

      let where = {};
      if (month && year) {
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        if (!isNaN(m) && !isNaN(y) && m >= 1 && m <= 12) {
          const start = new Date(Date.UTC(y, m - 1, 1));
          const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
          where.date = { [Op.between]: [start, end] };
        }
      }

      const records = await Attendance.findAll({
        where,
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: ["id", "name", "email"],
            include: [
              { model: Department, as: "department", attributes: ["id", "name"] },
              { model: Designation, as: "designation", attributes: ["id", "title"] },
            ],
          },
        ],
        order: [["date", "DESC"], [{ model: Employee, as: "employee" }, "name", "ASC"]],
      });

      res.status(200).json({
        status: true,
        message: "Attendance fetched successfully",
        data: records,
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getAttendanceById: async (req, res) => {
    try {
      const { id } = req.params;
      const record = await Attendance.findByPk(id, {
        include: [
          { model: Employee, as: "employee", attributes: ["id", "name", "email"] },
        ],
      });

      if (!record) {
        return res.status(404).json({
          status: false,
          message: "Attendance record not found",
        });
      }

      res.status(200).json({
        status: true,
        message: "Attendance fetched successfully",
        data: record,
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  updateAttendance: async (req, res) => {
    try {
      const { id } = req.params;
      const { employee_id, date, sign_in_time, sign_out_time, status } = req.body;

      const record = await Attendance.findByPk(id);
      if (!record) {
        return res.status(404).json({
          status: false,
          message: "Attendance not found",
        });
      }

      const formattedSignIn = sign_in_time ? new Date(`${date}T${sign_in_time}`) : null;
      const formattedSignOut = sign_out_time ? new Date(`${date}T${sign_out_time}`) : null;

      await record.update({
        employee_id,
        date,
        sign_in_time: formattedSignIn,
        sign_out_time: formattedSignOut,
        status,
      });

      res.status(200).json({
        status: true,
        message: "Attendance updated successfully",
        data: record,
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  deleteAttendance: async (req, res) => {
    try {
      const { id } = req.params;
      const record = await Attendance.findByPk(id);

      if (!record) {
        return res.status(404).json({
          status: false,
          message: "Attendance not found",
        });
      }

      await record.destroy();

      res.status(200).json({
        status: true,
        message: "Attendance deleted successfully",
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  // Employee-scoped endpoints
  getMyAttendance: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ status: false, message: 'Unauthorized' });

      const records = await Attendance.findAll({
        where: { employee_id: userId },
        order: [["date", "DESC"]],
      });
      res.status(200).json({ status: true, message: 'My attendance fetched', data: records });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  getMyToday: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ status: false, message: 'Unauthorized' });

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      let record = await Attendance.findOne({ where: { employee_id: userId, date: todayStr } });
      // If signed in but not signed out and it's past 18:00, auto sign-off now
      const workEnd = new Date(`${todayStr}T18:00:00`);
      if (record && record.sign_in_time && !record.sign_out_time && !isNaN(workEnd) && today >= workEnd) {
        await record.update({ sign_out_time: workEnd });
        record = await Attendance.findByPk(record.id);
      }
      res.status(200).json({ status: true, message: 'Today fetched', data: record });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },

  markToday: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ status: false, message: 'Unauthorized' });

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      // Idempotent: if already exists, return existing
      let record = await Attendance.findOne({ where: { employee_id: userId, date: todayStr } });
      if (record) {
        return res.status(200).json({ status: true, message: 'Already marked', data: record });
      }

      record = await Attendance.create({
        employee_id: userId,
        date: todayStr,
        sign_in_time: now,
        status: true,
      });
      return res.status(201).json({ status: true, message: 'Attendance marked', data: record });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
};

module.exports = attendanceController;
