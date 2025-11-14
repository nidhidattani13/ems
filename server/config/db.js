const { Sequelize } = require("sequelize");
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "ems",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: process.env.DB_DIALECT || "mysql", // <-- explicitly set dialect
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    logging: false,
  }
);

(async () => {
    try {
        await sequelize.authenticate();
    console.log('Database connection established successfully...');
    // Try to increase session max_allowed_packet if permitted (helps large base64 payloads)
    try {
      // attempt to set session-level value (may require privileges)
      await sequelize.query("SET SESSION max_allowed_packet = 67108864;");
      console.log('Session max_allowed_packet set to 64MB');
    } catch (e) {
      console.warn('Could not set session max_allowed_packet automatically. If you see "Got a packet bigger than", increase MySQL max_allowed_packet in my.cnf or via MySQL admin.');
    }
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
})();

module.exports = { sequelize };
