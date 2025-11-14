const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const {sequelize} = require('./config/db.js');
const departmentRoutes = require('./routes/departmentRoutes');
const designationRoutes = require("./routes/designationRoutes");
const leaveTypeRoutes = require("./routes/leaveTypeRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leavePolicyRoutes = require("./routes/leavePolicyRoutes");
const leaveRequestRoutes = require("./routes/leaveRequestRoutes");
const authRoutes = require("./routes/authRoutes");
const faceRoutes = require('./routes/faceRoutes');

dotenv.config();
const app = express();

// capture unhandled errors so we can see why process exits
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason, p) => {
    console.error('UNHANDLED REJECTION:', reason);
});

process.on('exit', (code) => {
    console.log('PROCESS EXIT event, code =', code);
});

app.use(cors());
// increase body size limits so base64 photos / large payloads don't trigger 413
// Set to 50mb to allow larger base64 uploads; adjust as needed.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/departments',departmentRoutes);
app.use('/api/designations',designationRoutes);
app.use('/api/leave-types',leaveTypeRoutes);
app.use('/api/employees',employeeRoutes);
app.use('/api/attendance',attendanceRoutes);
app.use('/api/leave-policies',leavePolicyRoutes);
app.use('/api/leave-requests',leaveRequestRoutes);
app.use('/api/auth',authRoutes);
app.use('/api/face', faceRoutes);


// Sync DB and apply non-destructive schema changes (adds missing columns/tables)
sequelize.sync({ alter: true })
    .then(() => console.log('Database synchronized (alter applied).'))
    .catch(err => console.error('Sync error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// global error handler to log unexpected errors
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err && err.stack ? err.stack : err);
    if (res.headersSent) return next(err);
    res.status(500).json({ status: false, message: err?.message || 'Internal Server Error' });
});
