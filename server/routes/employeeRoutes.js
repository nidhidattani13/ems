const express = require("express");
const router = express.Router();
const employeeController = require("../controller/employeeController");
const { verifyToken, isAdmin } = require("../controller/authController");

// Public route for registration to fetch reporting heads
router.get("/public", employeeController.listPublicHeads);

// Employee self profile (place BEFORE parameterized ':id' routes)
router.put("/me", verifyToken, employeeController.updateSelf);

// Admin protected routes
router.post("/", verifyToken, isAdmin, employeeController.createEmployee);
router.get("/", verifyToken, isAdmin, employeeController.getAllEmployees);
router.get("/:id", verifyToken, employeeController.getEmployeeById);
// Documents upload/delete (owner or admin)
router.post("/:id/documents", verifyToken, employeeController.uploadDocument);
router.delete("/:id/documents/:docId", verifyToken, employeeController.deleteDocument);
router.get("/:id/documents/:docId", verifyToken, employeeController.serveDocument);
router.put("/:id/documents/:docId", verifyToken, employeeController.updateDocument);
router.put("/:id", verifyToken, isAdmin, employeeController.updateEmployee);
router.delete("/:id", verifyToken, isAdmin, employeeController.deleteEmployee);

module.exports = router;
