const express = require("express");
const router = express.Router();
const { auth, requireAuth } = require("./../middleware/auth.js");
const {
  validateRegistration,
  validateLogin,
} = require("./../middleware/validation.js");
const {
  register,
  login,
  getProfile,
  updateProfile,
} = require("./../controller/authController.js");

router.post("/register", validateRegistration, register);
router.post("/login", validateLogin, login);
router.get("/profile", auth, requireAuth, getProfile);
router.put("/profile", auth, requireAuth, updateProfile);

module.exports = router;
