const { DataTypes } = require("sequelize");
const {sequelize} = require("../config/db");
const Employee = require("./employee");
const LeaveType = require("./leaveType");

const LeaveRequest = sequelize.define("LeaveRequest", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Employee,
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
  leave_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: LeaveType,
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  is_half_day: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  half_day_session: {
    type: DataTypes.ENUM("Morning", "Evening"),
    allowNull: true,
  },
  leave_status: {
    type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
    defaultValue: "Pending",
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Employee,
      key: "id",
    },
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: "leave_requests",
  timestamps: true,
});

Employee.hasMany(LeaveRequest, { foreignKey: "employee_id", as: "leaveRequests" });
LeaveRequest.belongsTo(Employee, { foreignKey: "employee_id", as: "employee" });

LeaveType.hasMany(LeaveRequest, { foreignKey: "leave_type_id", as: "leaveRequests" });
LeaveRequest.belongsTo(LeaveType, { foreignKey: "leave_type_id", as: "leaveType" });

Employee.hasMany(LeaveRequest, { foreignKey: "approved_by", as: "approvedLeaves" });
LeaveRequest.belongsTo(Employee, { foreignKey: "approved_by", as: "approver" });

module.exports = LeaveRequest;
