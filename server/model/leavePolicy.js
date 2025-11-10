const { DataTypes } = require("sequelize");
const {sequelize} = require("../config/db");
const Designation = require("./designation");
const LeaveType = require("./leaveType");

const LeavePolicy = sequelize.define("LeavePolicy", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  designation_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Designation,
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
  year_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  months_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: "leave_policies",
  timestamps: true,
});

Designation.hasMany(LeavePolicy, {
  foreignKey: "designation_id",
  as: "leavePolicies",
});
LeavePolicy.belongsTo(Designation, {
  foreignKey: "designation_id",
  as: "designation",
});

LeaveType.hasMany(LeavePolicy, {
  foreignKey: "leave_type_id",
  as: "leavePolicies",
});
LeavePolicy.belongsTo(LeaveType, {
  foreignKey: "leave_type_id",
  as: "leaveType",
});

module.exports = LeavePolicy;
