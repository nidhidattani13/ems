const { Sequelize } = require("sequelize");
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "ems",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: process.env.DB_DIALECT || "mysql", // <-- explicitly set dialect
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3307,
    logging: false,
  }
);

(async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully...');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
})();

module.exports = { sequelize };
