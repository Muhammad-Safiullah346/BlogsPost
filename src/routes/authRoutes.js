const express = require("express");
const router = express.Router();
const { auth, requireAuth } = require("./../middleware/auth.js");
const {
  validateRegistration,
  validateLogin,
  validateAccountDeletion,
} = require("./../middleware/validation.js");
const {
  register,
  login,
  getProfile,
  updateProfile,
  deactivateAccount,
  deleteAccount,
} = require("./../controller/authController.js");

// Public routes
router.post("/register", validateRegistration, register);
router.post("/login", validateLogin, login);

// Protected routes
router.get("/profile", auth, requireAuth, getProfile);
router.put("/profile", auth, requireAuth, updateProfile);
router.post("/deactivate", auth, requireAuth, deactivateAccount);
router.delete(
  "/delete",
  auth,
  requireAuth,
  validateAccountDeletion,
  deleteAccount
);

module.exports = router;
