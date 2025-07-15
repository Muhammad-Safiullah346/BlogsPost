const express = require("express");
const router = express.Router();
const { auth, requireSuperAdmin } = require("./../middleware/auth.js");
const {
  promoteToAdmin,
  demoteToUser,
  getAllUsers,
} = require("./../controller/authController.js");

// All superadmin routes require superadmin authentication
router.use(auth, requireSuperAdmin);

// User management routes
router.get("/users", getAllUsers);
router.put("/users/:userId/promote", promoteToAdmin);
router.put("/users/:userId/demote", demoteToUser);

// System management routes (can be extended later)
router.get("/stats", (req, res) => {
  // This can be implemented later for system statistics
  res.json({ message: "System stats endpoint - to be implemented" });
});

module.exports = router;
