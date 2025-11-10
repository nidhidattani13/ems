const express = require("express");
const router = express.Router();
const departmentController = require("../controller/departmentController");

router.post("/",departmentController.createDept);
router.get("/",departmentController.getallDept);
router.get("/:id",departmentController.getdeptbyid);
router.delete("/:id",departmentController.deletedept);
router.put("/:id",departmentController.updateDept);

module.exports = router;
