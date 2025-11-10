const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Department = sequelize.define("Department", {
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement:true
    },
    name:{
        type: DataTypes.STRING,
        allowNull:false,
        unique:true
    },
    status:{
        type: DataTypes.BOOLEAN,
        defaultValue:true
    },
},{
    tableName : 'department',
    timestamps : true
})

module.exports = Department;
