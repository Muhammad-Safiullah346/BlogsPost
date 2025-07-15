const express = require("express");
const router = express.Router();
const { auth, requireAuth, requireUser } = require("./../middleware/auth.js");
const {
  checkPermission,
  checkOwnership,
  checkInteractionPermission,
  checkModerationPermission,
} = require("./../middleware/acl.js");
const { validateInteraction } = require("./../middleware/validation.js");
const {
  createInteraction,
  getInteractions,
  updateInteraction,
  deleteInteraction,
} = require("./../controller/interactionController.js");
const Interaction = require("./../models/Interaction.js");

// Public routes - can be accessed by unknown users for published posts
router.get(
  "/post/:postId",
  auth,
  checkInteractionPermission("Read"),
  getInteractions
);

// Protected routes - require user authentication
router.post(
  "/post/:postId",
  auth,
  requireUser,
  checkInteractionPermission("Create"),
  validateInteraction,
  createInteraction
);

// Updated routes with moderation support
router.put(
  "/:id",
  auth,
  requireUser,
  checkPermission("interactions", "Update"),
  // First check ownership (for own interactions)
  checkOwnership(Interaction),
  // Then check moderation permissions (for admin/superadmin)
  checkModerationPermission(Interaction),
  updateInteraction
);

router.delete(
  "/:id",
  auth,
  requireUser,
  checkPermission("interactions", "Delete"),
  // First check ownership (for own interactions)
  checkOwnership(Interaction),
  // Then check moderation permissions (for admin/superadmin)
  checkModerationPermission(Interaction),
  deleteInteraction
);

module.exports = router;
