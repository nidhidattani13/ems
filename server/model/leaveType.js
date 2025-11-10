const { DataTypes } = require("sequelize");
const {sequelize} = require("../config/db");

const LeaveType = sequelize.define("LeaveType", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  is_paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: "leave_type",
  timestamps: true,
});

module.exports = LeaveType;
