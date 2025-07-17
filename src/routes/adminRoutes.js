const express = require("express");
const router = express.Router();
const {
  auth,
  requireAdmin,
  requireSuperAdmin,
} = require("./../middleware/auth.js");
const {
  checkPermission,
  checkConditionalPermission,
  checkModerationPermission,
} = require("./../middleware/acl.js");
const Post = require("./../models/Post.js");
const User = require("./../models/User.js");
const Interaction = require("./../models/Interaction.js");

// Import controllers
const {
  getAllUsers,
  promoteToAdmin,
  demoteToUser,
  deactivateAccount,
  deleteAccount,
} = require("./../controller/authController.js");

const {
  getPosts,
  getPost,
  updatePost,
  deletePost,
  createPost,
  createRepost,
  getDraftPosts,
  getMyPosts,
  getLikedPosts,
  getCommentedPosts,
} = require("./../controller/postController.js");

const {
  getInteractions,
  updateInteraction,
  createInteraction,
  deleteInteraction,
  getCommentReplies,
  getCommentLikes,
  getInteractionHistory,
} = require("./../controller/interactionController.js");

const {
  validatePost,
  validatePostUpdate,
  validateInteraction,
} = require("./../middleware/validation.js");

// All admin routes require admin authentication (admin or superadmin)
router.use(auth, requireAdmin);

// ===== USER MANAGEMENT ROUTES =====

// Get all users (admin can read any user)
router.get("/users", checkPermission("users", "Read"), getAllUsers);

// Get specific user by ID
router.get("/users/:id", checkPermission("users", "Read"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update user (admin can update regular users, not other admins)
router.put(
  "/users/:id",
  checkPermission("users", "Update"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Remove sensitive fields that shouldn't be updated via admin
      delete updates.password;
      delete updates.role; // Role changes have separate endpoints

      const user = await User.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        message: "User updated successfully",
        user,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

// Deactivate user account (admin can deactivate regular users)
router.post(
  "/users/:id/deactivate",
  checkPermission("users", "Deactivate"),
  async (req, res) => {
    try {
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Set the target user in req for the controller
      req.targetUser = targetUser;
      await deactivateAccount(req, res);
    } catch (error) {
      console.error("Deactivate user error:", error);
      res.status(500).json({ error: "Failed to deactivate user" });
    }
  }
);

// Delete user account (admin can delete regular users)
router.delete(
  "/users/:id",
  checkPermission("users", "Delete"),
  async (req, res) => {
    try {
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Set the target user in req for the controller
      req.targetUser = targetUser;
      await deleteAccount(req, res);
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

// Create admin user (superadmin only)
router.post(
  "/users",
  requireSuperAdmin,
  checkPermission("users", "Create"),
  async (req, res) => {
    try {
      const {
        username,
        email,
        password,
        firstName,
        lastName,
        role = "user",
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(400).json({
          error: "User with this email or username already exists",
        });
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        role,
        profile: {
          firstName,
          lastName,
        },
      });

      await user.save();

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: user.profile,
        },
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  }
);

// ===== POST MANAGEMENT ROUTES =====

// Public posts access
router.route("/posts").get(checkPermission("posts", "Read"), getPosts); // Get published posts

router
  .route("/posts/:id")
  .get(
    checkPermission("posts", "Read"),
    checkConditionalPermission(Post),
    getPost
  );

// Repost - more RESTful route
router.post(
  "/posts/repost/:id",
  checkPermission("reposts", "Create"),
  createRepost
);

// Post interactions
router
  .route("/posts/:postId/interactions")
  .get(checkPermission("interactions", "Read"), getInteractions)
  .post(
    checkPermission("interactions", "Create"),
    validateInteraction,
    createInteraction
  );

// Comment-specific interactions
router
  .route("/posts/:postId/comments/:commentId/interactions")
  .post(
    checkPermission("interactions", "Create"),
    validateInteraction,
    createInteraction
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

// Delete any post (admin can moderate posts from regular users)
router.delete("/posts/:id", checkPermission("posts", "Delete"), deletePost);

router
  .route("/me/posts/:id")
  .get(checkPermission("posts", "Read"), getDraftPosts)
  .put(checkPermission("posts", "Update"), validatePostUpdate, updatePost)
  .delete(checkPermission("posts", "Delete"), deletePost);

router
  .route("/me/posts")
  .get(checkPermission("posts", "Read"), getMyPosts) // List my posts
  .post(checkPermission("posts", "Create"), validatePost, createPost); // Create new post

// Get drafts using the regular posts route with draft filter
router.get(
  "/me/posts/drafts",
  checkPermission("posts", "Read"),
  async (req, res, next) => {
    // Find all draft posts for the current user
    req.posts = await Post.find({
      author: req.user._id,
      status: "draft",
    });
    next();
  },
  getPost
);

// Filtered personal posts
router.get("/me/posts/liked", checkPermission("posts", "Read"), getLikedPosts);
router.get(
  "/me/posts/commented",
  checkPermission("posts", "Read"),
  getCommentedPosts
);

// Get posts by specific user
router.get(
  "/users/:userId/posts",
  checkPermission("posts", "Read"),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10, status } = req.query;

      const query = { author: userId };
      if (status && ["draft", "published", "archived"].includes(status)) {
        query.status = status;
      }

      const posts = await Post.find(query)
        .populate("author", "username profile.firstName profile.lastName")
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const total = await Post.countDocuments(query);

      res.json({
        posts,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      });
    } catch (error) {
      console.error("Get user posts error:", error);
      res.status(500).json({ error: "Failed to fetch user posts" });
    }
  }
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

// ===== INTERACTION MANAGEMENT ROUTES =====

// Get all interactions (admin can read any interaction)
router.get(
  "/interactions",
  checkPermission("interactions", "Read"),
  getInteractions
);

// Get interactions by specific user
router.get(
  "/users/:userId/interactions",
  checkPermission("interactions", "Read"),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10, type } = req.query;

      const query = { user: userId };
      if (type && ["like", "comment", "repost"].includes(type)) {
        query.type = type;
      }

      const interactions = await Interaction.find(query)
        .populate("user", "username profile.firstName profile.lastName")
        .populate("post", "title content")
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const total = await Interaction.countDocuments(query);

      res.json({
        interactions,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      });
    } catch (error) {
      console.error("Get user interactions error:", error);
      res.status(500).json({ error: "Failed to fetch user interactions" });
    }
  }
);

module.exports = router;
