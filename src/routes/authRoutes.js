const express = require("express");
const router = express.Router();
const {
  validateRegistration,
  validateLogin,
} = require("./../middleware/validation.js");
const { register, login } = require("./../controller/authController.js");

// Public routes only - authentication and registration
router.post("/register", validateRegistration, register);
router.post("/login", validateLogin, login);

// Logout route (client-side token removal, but we can track it server-side if needed)
router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
