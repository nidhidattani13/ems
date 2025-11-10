const express = require("express");
const router = express.Router();
const designationController = require("../controller/designationController");

router.post("/", designationController.createDesignation);
router.get("/", designationController.getAllDesignations);
router.get("/department/:department_id", designationController.getByDepartmentId);
router.get("/:id", designationController.getDesignationById);
router.put("/:id", designationController.updateDesignation);
router.delete("/:id", designationController.deleteDesignation);

module.exports = router;
