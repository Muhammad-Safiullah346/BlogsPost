const express = require("express");
const router = express.Router();
const { auth, requireAuth } = require("./../middleware/auth.js");
const { checkPermission, checkOwnership } = require("./../middleware/acl.js");
const { validateInteraction } = require("./../middleware/validation.js");
const {
  createInteraction,
  getInteractions,
  updateInteraction,
  deleteInteraction,
} = require("./../controller/interactionController.js");
const Interaction = require("./../models/Interaction.js");

// Public routes
router.get(
  "/post/:postId",
  auth,
  checkPermission("interactions", "Read"),
  getInteractions
);

// Protected routes
router.post(
  "/post/:postId",
  auth,
  requireAuth,
  checkPermission("interactions", "Create"),
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
