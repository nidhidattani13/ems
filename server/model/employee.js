const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Department = require("./department");
const Designation = require("./designation");

const Employee = sequelize.define(
  "Employee",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    department_id: { type: DataTypes.INTEGER, allowNull: false },
    designation_id: { type: DataTypes.INTEGER, allowNull: false },
    reporting_head_id: { type: DataTypes.INTEGER, allowNull: true },
    role: {
      type: DataTypes.ENUM("admin", "employee"),
      allowNull: false,
      defaultValue: "employee",
    },
    status: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: "employees",
    timestamps: true,
  }
);

// ✅ Define Relations with Aliases
Department.hasMany(Employee, { foreignKey: "department_id", as: "employees" });
Employee.belongsTo(Department, {
  foreignKey: "department_id",
  as: "department",
});

Designation.hasMany(Employee, {
  foreignKey: "designation_id",
  as: "employees",
});
Employee.belongsTo(Designation, {
  foreignKey: "designation_id",
  as: "designation",
});

// ✅ Self-relation for Reporting Head
Employee.belongsTo(Employee, {
  foreignKey: "reporting_head_id",
  as: "reporting_head",
});

module.exports = Employee;
