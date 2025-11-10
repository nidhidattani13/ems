const express = require("express");
const router = express.Router();
const leaveTypeController = require("../controller/leaveTypeController");

router.post("/", leaveTypeController.createLeaveType);
router.get("/", leaveTypeController.getAllLeaveTypes);
router.get("/:id", leaveTypeController.getLeaveTypeById);
router.put("/:id", leaveTypeController.updateLeaveType);
router.delete("/:id", leaveTypeController.deleteLeaveType);

module.exports = router;
