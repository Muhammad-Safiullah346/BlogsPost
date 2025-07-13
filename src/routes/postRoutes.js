const express = require("express");
const router = express.Router();
const { auth, requireAuth } = require("./../middleware/auth.js");
const { checkPermission, checkOwnership } = require("./../middleware/acl.js");
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

// Public routes (accessible to unknown users)
router.get("/", auth, checkPermission("posts", "Read"), getPosts);
router.get("/:id", auth, checkPermission("posts", "Read"), getPost);

// Protected routes (require authentication)
router.post(
  "/",
  auth,
  requireAuth,
  checkPermission("posts", "Create"),
  validatePost,
  createPost
);
router.put(
  "/:id",
  auth,
  requireAuth,
  checkPermission("posts", "Update"),
  checkOwnership(Post),
  validatePost,
  updatePost
);
router.delete(
  "/:id",
  auth,
  requireAuth,
  checkPermission("posts", "Delete"),
  checkOwnership(Post),
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
