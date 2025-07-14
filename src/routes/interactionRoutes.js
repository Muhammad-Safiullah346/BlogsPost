const express = require("express");
const router = express.Router();
const { auth, requireAuth } = require("./../middleware/auth.js");
const {
  checkPermission,
  checkOwnership,
  checkInteractionPermission,
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

// Protected routes - require authentication
router.post(
  "/post/:postId",
  auth,
  requireAuth,
  checkInteractionPermission("Create"),
  validateInteraction,
  createInteraction
);

router.put(
  "/:id",
  auth,
  requireAuth,
  checkPermission("interactions", "Update"),
  checkOwnership(Interaction),
  updateInteraction
);

router.delete(
  "/:id",
  auth,
  requireAuth,
  checkPermission("interactions", "Delete"),
  checkOwnership(Interaction),
  deleteInteraction
);

module.exports = router;
