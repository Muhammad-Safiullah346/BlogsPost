const express = require("express");
const router = express.Router();
const { auth, requireAuth } = require("./../middleware/auth.js");
const {
  checkPermission,
  checkOwnership,
  checkConditionalPermission,
  checkModerationPermission,
} = require("./../middleware/acl.js");
const { validatePost } = require("./../middleware/validation.js");
const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  createRepost,
} = require("./../controller/postController.js");
const Post = require("./../models/Post.js");

// Public routes (accessible to unknown users with restrictions)
router.get("/", auth, checkPermission("posts", "Read"), getPosts);

router.get(
  "/:id",
  auth,
  checkPermission("posts", "Read"),
  checkConditionalPermission(Post),
  getPost
);

// Protected routes (require authentication)
router.post(
  "/",
  auth,
  requireAuth,
  checkPermission("posts", "Create"),
  validatePost,
  createPost
);

// Updated routes with moderation support
router.put(
  "/:id",
  auth,
  requireAuth,
  checkPermission("posts", "Update"),
  // First check ownership (for own posts)
  checkOwnership(Post, "author"),
  // Then check moderation permissions (for admin/superadmin)
  checkModerationPermission(Post, "author"),
  validatePost,
  updatePost
);

router.delete(
  "/:id",
  auth,
  requireAuth,
  checkPermission("posts", "Delete"),
  // First check ownership (for own posts)
  checkOwnership(Post, "author"),
  // Then check moderation permissions (for admin/superadmin)
  checkModerationPermission(Post, "author"),
  deletePost
);

// Repost routes
router.post(
  "/repost",
  auth,
  requireAuth,
  checkPermission("reposts", "Create"),
  createRepost
);

module.exports = router;
