const { DataTypes } = require("sequelize");
const {sequelize} = require("../config/db");
const Department = require("./department");

const Designation = sequelize.define("Designation", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Department,
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: "designation",
  timestamps: true,
});

Department.hasMany(Designation, {
  foreignKey: "department_id",
  as: "designations",
});

Designation.belongsTo(Department, {
  foreignKey: "department_id",
  as: "department",
});

module.exports = Designation;
