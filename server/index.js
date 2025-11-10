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

app.use(cors());
app.use(express.json());

app.use('/api/departments',departmentRoutes);
app.use('/api/designations',designationRoutes);
app.use('/api/leave-types',leaveTypeRoutes);
app.use('/api/employees',employeeRoutes);
app.use('/api/attendance',attendanceRoutes);
app.use('/api/leave-policies',leavePolicyRoutes);
app.use('/api/leave-requests',leaveRequestRoutes);
app.use('/api/auth',authRoutes);
app.use('/api/face', faceRoutes);


sequelize.sync()
    .then(() => console.log('Database synchronized.'))
    .catch(err => console.error('Sync error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
