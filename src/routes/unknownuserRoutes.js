const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth.js");
const {
  checkPermission,
  checkConditionalPermission,
} = require("../middleware/acl.js");
const { getPosts, getPost } = require("../controller/postController.js");
const {
  getInteractions,
  getCommentReplies,
  getCommentLikes,
} = require("./../controller/interactionController.js");
const Post = require("../models/Post.js");

router.use(auth);

// Public posts access
router.route("/posts").get(checkPermission("posts", "Read"), getPosts); // Get published posts

router
  .route("/posts/:id")
  .get(
    checkPermission("posts", "Read"),
    checkConditionalPermission(Post),
    getPost
  );

// Post interactions
router
  .route("/posts/:id/interactions")
  .get(
    checkPermission("interactions", "Read"),
    checkConditionalPermission(Post),
    getInteractions
  );

// Comment-specific routes
router.get(
  "/posts/:postId/comments/:commentId/replies",
  checkPermission("interactions", "Read"),
  getCommentReplies
);

router.get(
  "/posts/:postId/comments/:commentId/likes",
  checkPermission("interactions", "Read"),
  getCommentLikes
);

module.exports = router;
