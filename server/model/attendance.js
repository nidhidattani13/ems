const { DataTypes } = require("sequelize");
const {sequelize} = require("../config/db");
const Employee = require("./employee");

const Attendance = sequelize.define("Attendance", {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  sign_in_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sign_out_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: "attendance",
  timestamps: true,
});

// Associations
Employee.hasMany(Attendance, {
  foreignKey: "employee_id",
  as: "attendances",
});
Attendance.belongsTo(Employee, {
  foreignKey: "employee_id",
  as: "employee",
});

module.exports = Attendance;
