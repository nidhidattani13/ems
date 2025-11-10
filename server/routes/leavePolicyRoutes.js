const express = require("express");
const router = express.Router();
const leavePolicyController = require("../controller/leavePolicyController");

router.post("/", leavePolicyController.createPolicy);
router.get("/", leavePolicyController.getAllPolicies);
router.get("/:id", leavePolicyController.getPolicyById);
router.put("/:id", leavePolicyController.updatePolicy);
router.delete("/:id", leavePolicyController.deletePolicy);

module.exports = router;
