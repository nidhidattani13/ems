const express = require("express");
const router = express.Router();
const authController = require("../controller/authController");

// Public
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected Example
router.get("/verify", authController.verifyToken, (req, res) => {
  res.status(200).json({ status: true, message: "Token verified", user: req.user });
});

module.exports = router;
