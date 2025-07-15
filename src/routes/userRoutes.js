const express = require("express");
const router = express.Router();
const { auth, requireUser } = require("./../middleware/auth.js");
const { checkPermission } = require("./../middleware/permissions.js");
const {
  getProfile,
  updateProfile,
  deactivateAccount,
  deleteAccount,
} = require("./../controller/authController.js");
const { validateAccountDeletion } = require("./../middleware/validation.js");

// All user routes require user authentication (user, admin, or superadmin)
router.use(auth, requireUser);

// Profile management
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// Account management - now using permission system
router.post(
  "/account/deactivate",
  checkPermission("users", "Deactivate"),
  deactivateAccount
);

router.delete(
  "/account/delete",
  validateAccountDeletion,
  checkPermission("users", "Delete"),
  deleteAccount
);

module.exports = router;
