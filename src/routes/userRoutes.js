const express = require("express");
const router = express.Router();
const { auth, requireUser } = require("./../middleware/auth.js");
const {
  checkOwnership,
  checkPermission,
  checkConditionalPermission,
} = require("./../middleware/acl.js");
const Post = require("./../models/Post.js");
const Interaction = require("./../models/Interaction.js");
const {
  getProfile,
  updateProfile,
  deactivateAccount,
  deleteAccount,
} = require("./../controller/authController.js");
const {
  validatePost,
  validatePostUpdate,
  validateInteraction,
  validateRepost,
} = require("./../middleware/validation.js");
const {
  createInteraction,
  getInteractions,
  updateInteraction,
  deleteInteraction,
  getInteractionHistory,
  verifyComment,
} = require("./../controller/interactionController.js");
const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  createRepost,
  getDraftPosts,
  getLikedPosts,
  getCommentedPosts,
} = require("./../controller/postController.js");

const { validateAccountDeletion } = require("./../middleware/validation.js");

// All user routes require user authentication (user, admin, or superadmin)
router.use(auth, requireUser);

// Profile management
router
  .route("/profile")
  .get(checkPermission("users", "Read"), getProfile)
  .put(checkPermission("users", "Update"), updateProfile);

// Account management - now using permission system
router.post(
  "/account/deactivate",
  checkPermission("users", "Deactivate"),
  deactivateAccount
);

router.delete(
  "/account/delete",
  checkPermission("users", "Delete"),
  validateAccountDeletion,
  deleteAccount
);

// Public posts access
router.route("/posts").get(
  (req, res, next) => {
    req.ownerView = false;
    next();
  },
  checkPermission("posts", "Read"),
  checkConditionalPermission(Post),
  getPosts
);

router.route("/posts/:id").get(
  (req, res, next) => {
    req.ownerView = false;
    next();
  },
  checkPermission("posts", "Read"),
  checkConditionalPermission(Post),
  getPost
);

// Repost - more RESTful route
router.post(
  "/posts/:id/repost",
  checkPermission("reposts", "Create"),
  checkConditionalPermission(Post),
  validateRepost,
  createRepost
);

// Post interactions
router
  .route("/posts/:id/interactions")
  .get(
    (req, res, next) => {
      req.ownerView = false;
      next();
    },
    checkPermission("interactions", "Read"),
    checkConditionalPermission(Post),
    verifyComment,
    getInteractions
  )
  .post(
    checkPermission("interactions", "Create"),
    checkConditionalPermission(Post),
    verifyComment,
    validateInteraction,
    createInteraction
  );

// Individual interaction management on posts
router
  .route("/posts/:id/interactions/:interactionId")
  .put(
    checkPermission("interactions", "Update"),
    checkConditionalPermission(Post), // Uses req.params.id (post ID)
    (req, res, next) => {
      // Now switch to interaction ID for ownership check
      req.params.id = req.params.interactionId;
      next();
    },
    checkOwnership(Interaction, "user"), // Uses req.params.id (interaction ID)
    validateInteraction,
    updateInteraction
  )
  .delete(
    checkPermission("interactions", "Delete"),
    checkConditionalPermission(Post), // Uses req.params.id (post ID)
    (req, res, next) => {
      // Now switch to interaction ID for ownership check
      req.params.id = req.params.interactionId;
      next();
    },
    checkOwnership(Interaction, "user"), // Uses req.params.id (interaction ID)
    deleteInteraction
  );

// Comment-specific interactions
router
  .route("/posts/:postid/comments/:commentId/interactions")
  .get(
    (req, res, next) => {
      req.ownerView = false;
      next();
    },
    checkPermission("interactions", "Read"),
    checkConditionalPermission(Post),
    verifyComment,
    getInteractions
  )
  .post(
    checkPermission("interactions", "Create"),
    checkConditionalPermission(Post),
    verifyComment,
    validateInteraction,
    createInteraction
  );

router
  .route("/posts/:id/comments/:commentId/interactions/:interactionId")
  .put(
    checkPermission("interactions", "Update"),
    checkConditionalPermission(Post), // Uses req.params.id (post ID)
    verifyComment,
    (req, res, next) => {
      // Now switch to interaction ID for ownership check
      req.params.id = req.params.interactionId;
      next();
    },
    checkOwnership(Interaction, "user"), // Uses req.params.id (interaction ID)
    validateInteraction,
    updateInteraction
  )
  .delete(
    checkPermission("interactions", "Delete"),
    checkConditionalPermission(Post), // Uses req.params.id (post ID)
    verifyComment,
    (req, res, next) => {
      // Now switch to interaction ID for ownership check
      req.params.id = req.params.interactionId;
      next();
    },
    checkOwnership(Interaction, "user"), // Uses req.params.id (interaction ID)
    deleteInteraction
  );

router
  .route("/me/posts")
  .get(
    (req, res, next) => {
      req.ownerView = true;
      next();
    },
    checkPermission("posts", "Read"),
    checkConditionalPermission(Post),
    getPosts
  ) // List my posts
  .post(checkPermission("posts", "Create"), validatePost, createPost); // Create new post

// User's posts management - allows viewing all post statuses for owner
router
  .route("/me/posts/:id")
  .get(
    (req, res, next) => {
      req.ownerView = true;
      next();
    },
    checkPermission("posts", "Read"),
    checkConditionalPermission(Post),
    getPost
  )
  .put(
    checkPermission("posts", "Update"),
    checkOwnership(Post, "author"),
    validatePostUpdate,
    updatePost
  )
  .delete(
    checkPermission("posts", "Delete"),
    checkOwnership(Post, "author"),
    deletePost
  );

router
  .route("/me/posts/:id/interactions")
  .get(
    (req, res, next) => {
      req.ownerView = true;
      next();
    },
    checkPermission("interactions", "Read"),
    checkConditionalPermission(Post),
    verifyComment,
    getInteractions
  )
  .post(
    checkPermission("interactions", "Create"),
    checkConditionalPermission(Post),
    validateInteraction,
    verifyComment,
    createInteraction
  )
  .put(
    checkPermission("posts", "Update"),
    checkOwnership(Post, "author"),
    validatePostUpdate,
    updatePost
  )
  .delete(
    checkPermission("posts", "Delete"),
    checkOwnership(Post, "author"),
    deletePost
  );

// Personal interaction history and management
router.get(
  "/me/interactions",
  checkPermission("interactions", "Read"),
  getInteractionHistory
);

// Managing specific interactions
router
  .route("/me/interactions/:id")
  .put(
    checkPermission("interactions", "Update"),
    validateInteraction,
    updateInteraction
  )
  .delete(checkPermission("interactions", "Delete"), deleteInteraction);

module.exports = router;
