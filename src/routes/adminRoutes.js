const express = require("express");
const router = express.Router();
const { auth, requireAdmin } = require("./../middleware/auth.js");
const { getAllUsers } = require("./../controller/authController.js");

// All admin routes require admin authentication (admin or superadmin)
router.use(auth, requireAdmin);

// Admin can view users but cannot promote/demote
router.get("/users", getAllUsers);

// Content moderation routes (can be extended later)
router.get("/moderate", (req, res) => {
  res.json({ message: "Content moderation endpoint - to be implemented" });
});

// Reports management (can be extended later)
router.get("/reports", (req, res) => {
  res.json({ message: "Reports management endpoint - to be implemented" });
});

module.exports = router;
