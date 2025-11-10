const express = require("express");
const router = express.Router();
const attendanceController = require("../controller/attendanceController");
const { verifyToken, isAdmin } = require("../controller/authController");

// Employee endpoints (place BEFORE param routes)
router.get("/my", verifyToken, attendanceController.getMyAttendance);
router.get("/my/today", verifyToken, attendanceController.getMyToday);
router.post("/mark", verifyToken, attendanceController.markToday);
router.post("/sign-in", verifyToken, attendanceController.signInToday);
router.post("/sign-out", verifyToken, attendanceController.signOutToday);

// Admin endpoints
router.post("/", verifyToken, attendanceController.createAttendance);
router.get("/", verifyToken, isAdmin, attendanceController.getAllAttendance);
router.get("/:id", verifyToken, attendanceController.getAttendanceById);
router.put("/:id", verifyToken, isAdmin, attendanceController.updateAttendance);
router.delete("/:id", verifyToken, isAdmin, attendanceController.deleteAttendance);

module.exports = router;
