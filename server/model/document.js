const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Employee = require('./employee');

const Document = sequelize.define('Document', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  filename: { type: DataTypes.STRING, allowNull: true },
  // store base64 as LONG text to support large payloads
  data: { type: DataTypes.TEXT('long'), allowNull: false },
}, {
  tableName: 'documents',
  timestamps: true,
});

Employee.hasMany(Document, { foreignKey: 'employee_id', as: 'documents' });
Document.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

module.exports = Document;
