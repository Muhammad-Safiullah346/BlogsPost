const express = require("express");
const router = express.Router();
const { auth, requireSuperAdmin } = require("./../middleware/auth.js");
const { checkPermission } = require("./../middleware/acl.js");
const Post = require("./../models/Post.js");
const User = require("./../models/User.js");
const Interaction = require("./../models/Interaction.js");

// Import controllers
const {
  promoteToAdmin,
  demoteToUser,
  getAllUsers,
  deactivateAccount,
  deleteAccount,
} = require("./../controller/authController.js");

const {
  getPosts,
  getPost,
  updatePost,
  deletePost,
  createPost,
} = require("./../controller/postController.js");

const {
  getInteractions,
  updateInteraction,
  deleteInteraction,
} = require("./../controller/interactionController.js");

const {
  validatePost,
  validatePostUpdate,
  validateInteraction,
} = require("./../middleware/validation.js");

// All superadmin routes require superadmin authentication
router.use(auth, requireSuperAdmin);

// ===== USER MANAGEMENT ROUTES =====

// Get all users (superadmin can read any user)
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

// Create new user (superadmin can create any user)
router.post("/users", checkPermission("users", "Create"), async (req, res) => {
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
});

// Update any user (superadmin can update any user)
router.put("/users/:id", checkPermission("users", "Read"), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove password from updates (should use separate endpoint)
    delete updates.password;

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
});

// Promote user to admin
router.post("/users/:userId/promote", promoteToAdmin);

// Demote admin to user
router.post("/users/:userId/demote", demoteToUser);

// Deactivate any user account (superadmin can deactivate any user)
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

// Delete any user account (superadmin can delete any user)
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

// ===== POST MANAGEMENT ROUTES =====

// Get all posts (superadmin can read any post)
router.get("/posts", checkPermission("posts", "Read"), getPosts);

// Get specific post by ID
router.get("/posts/:id", checkPermission("posts", "Read"), getPost);

// Create post as superadmin
router.post("/posts", async (req, res) => {
  try {
    const {
      title,
      content,
      tags,
      featuredImage,
      excerpt,
      status = "published",
      author,
    } = req.body;

    // Superadmin can create posts for any user or themselves
    const postData = {
      title,
      content,
      tags: tags || [],
      featuredImage,
      excerpt,
      status,
      author: author || req.user.id, // Default to superadmin if no author specified
    };

    const post = new Post(postData);
    await post.save();

    await post.populate("author", "username profile");

    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Update any post (superadmin can update any post)
router.put("/posts/:id", validatePostUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags, featuredImage, excerpt, status } = req.body;

    const post = await Post.findByIdAndUpdate(
      id,
      { title, content, tags, featuredImage, excerpt, status },
      { new: true, runValidators: true }
    ).populate("author", "username profile");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      message: "Post updated successfully",
      post,
    });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// Delete any post (superadmin can delete any post)
router.delete(
  "/posts/:id",
  checkPermission("posts", "Delete"),
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Set the post in req for the controller
      req.post = post;
      await deletePost(req, res);
    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  }
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

// ===== INTERACTION MANAGEMENT ROUTES =====

// Get all interactions (superadmin can read any interaction)
router.get(
  "/interactions",
  checkPermission("interactions", "Read"),
  getInteractions
);

// Get interactions for specific post
router.get(
  "/posts/:postId/interactions",
  checkPermission("interactions", "Read"),
  getInteractions
);

// Update any interaction (superadmin can update any interaction)
router.put("/interactions/:id", validateInteraction, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const interaction = await Interaction.findByIdAndUpdate(
      id,
      { content },
      { new: true, runValidators: true }
    )
      .populate("user", "username profile")
      .populate("post", "title");

    if (!interaction) {
      return res.status(404).json({ error: "Interaction not found" });
    }

    res.json({
      message: "Interaction updated successfully",
      interaction,
    });
  } catch (error) {
    console.error("Update interaction error:", error);
    res.status(500).json({ error: "Failed to update interaction" });
  }
});

// Delete any interaction (superadmin can delete any interaction)
router.delete(
  "/interactions/:id",
  checkPermission("interactions", "Delete"),
  async (req, res) => {
    try {
      const interaction = await Interaction.findById(req.params.id);
      if (!interaction) {
        return res.status(404).json({ error: "Interaction not found" });
      }

      // Set the interaction in req for the controller
      req.interaction = interaction;
      await deleteInteraction(req, res);
    } catch (error) {
      console.error("Delete interaction error:", error);
      res.status(500).json({ error: "Failed to delete interaction" });
    }
  }
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

// ===== BULK OPERATIONS =====

// Bulk delete posts
router.post(
  "/posts/bulk-delete",
  checkPermission("posts", "Delete"),
  async (req, res) => {
    try {
      const { postIds } = req.body;

      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({ error: "Post IDs array is required" });
      }

      // Delete posts and their related data
      const [deletedPosts, deletedInteractions] = await Promise.all([
        Post.deleteMany({ _id: { $in: postIds } }),
        Interaction.deleteMany({ post: { $in: postIds } }),
      ]);

      res.json({
        message: "Posts deleted successfully",
        deletedPosts: deletedPosts.deletedCount,
        deletedInteractions: deletedInteractions.deletedCount,
      });
    } catch (error) {
      console.error("Bulk delete posts error:", error);
      res.status(500).json({ error: "Failed to delete posts" });
    }
  }
);

// Bulk delete interactions
router.post(
  "/interactions/bulk-delete",
  checkPermission("interactions", "Delete"),
  async (req, res) => {
    try {
      const { interactionIds } = req.body;

      if (!Array.isArray(interactionIds) || interactionIds.length === 0) {
        return res
          .status(400)
          .json({ error: "Interaction IDs array is required" });
      }

      const result = await Interaction.deleteMany({
        _id: { $in: interactionIds },
      });

      res.json({
        message: "Interactions deleted successfully",
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.error("Bulk delete interactions error:", error);
      res.status(500).json({ error: "Failed to delete interactions" });
    }
  }
);

// Bulk update user roles
router.post(
  "/users/bulk-role-update",
  checkPermission("users", "Read"),
  async (req, res) => {
    try {
      const { userIds, newRole } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "User IDs array is required" });
      }

      if (!["user", "admin"].includes(newRole)) {
        return res
          .status(400)
          .json({ error: "Invalid role. Must be 'user' or 'admin'" });
      }

      const result = await User.updateMany(
        { _id: { $in: userIds } },
        { role: newRole }
      );

      res.json({
        message: "User roles updated successfully",
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Bulk role update error:", error);
      res.status(500).json({ error: "Failed to update user roles" });
    }
  }
);

// ===== ANALYTICS AND REPORTING ROUTES =====

// Get comprehensive platform statistics
router.get("/stats", async (req, res) => {
  try {
    const [userStats, postStats, interactionStats, dailyStats] =
      await Promise.all([
        User.aggregate([
          {
            $group: {
              _id: "$role",
              count: { $sum: 1 },
            },
          },
        ]),
        Post.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
        Interaction.aggregate([
          {
            $group: {
              _id: "$type",
              count: { $sum: 1 },
            },
          },
        ]),
        // Daily activity for the last 30 days
        Post.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              posts: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    // Get total counts
    const [totalUsers, totalPosts, totalInteractions] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Interaction.countDocuments(),
    ]);

    res.json({
      totals: {
        users: totalUsers,
        posts: totalPosts,
        interactions: totalInteractions,
      },
      breakdown: {
        users: userStats,
        posts: postStats,
        interactions: interactionStats,
      },
      dailyActivity: dailyStats,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get recent activity with enhanced details
router.get("/activity", async (req, res) => {
  try {
    const { limit = 20, type } = req.query;
    const limitPerType = Math.ceil(limit / 3);

    let activities = [];

    if (!type || type === "posts") {
      const recentPosts = await Post.find()
        .populate("author", "username profile.firstName profile.lastName")
        .sort({ createdAt: -1 })
        .limit(limitPerType);

      activities.push(
        ...recentPosts.map((post) => ({
          type: "post",
          action: "created",
          data: post,
          timestamp: post.createdAt,
        }))
      );
    }

    if (!type || type === "interactions") {
      const recentInteractions = await Interaction.find()
        .populate("user", "username profile.firstName profile.lastName")
        .populate("post", "title")
        .sort({ createdAt: -1 })
        .limit(limitPerType);

      activities.push(
        ...recentInteractions.map((interaction) => ({
          type: "interaction",
          action: interaction.type,
          data: interaction,
          timestamp: interaction.createdAt,
        }))
      );
    }

    if (!type || type === "users") {
      const recentUsers = await User.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(limitPerType);

      activities.push(
        ...recentUsers.map((user) => ({
          type: "user",
          action: "registered",
          data: user,
          timestamp: user.createdAt,
        }))
      );
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit to requested amount
    activities = activities.slice(0, limit);

    res.json({
      activities,
      count: activities.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Get activity error:", error);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

// Get detailed user analytics
router.get("/analytics/users", async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    // Calculate date range
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [registrationTrend, roleDistribution, activeUsers] =
      await Promise.all([
        User.aggregate([
          {
            $match: { createdAt: { $gte: startDate } },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        User.aggregate([
          {
            $group: {
              _id: "$role",
              count: { $sum: 1 },
            },
          },
        ]),
        User.aggregate([
          {
            $match: {
              isActive: true,
              lastLogin: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: "$role",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    res.json({
      registrationTrend,
      roleDistribution,
      activeUsers,
      period,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Get user analytics error:", error);
    res.status(500).json({ error: "Failed to fetch user analytics" });
  }
});

// Get content analytics
router.get("/analytics/content", async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [postTrends, interactionTrends, topAuthors, topPosts] =
      await Promise.all([
        Post.aggregate([
          {
            $match: { createdAt: { $gte: startDate } },
          },
          {
            $group: {
              _id: {
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                status: "$status",
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.date": 1 } },
        ]),
        Interaction.aggregate([
          {
            $match: { createdAt: { $gte: startDate } },
          },
          {
            $group: {
              _id: {
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                type: "$type",
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.date": 1 } },
        ]),
        Post.aggregate([
          {
            $match: { createdAt: { $gte: startDate } },
          },
          {
            $group: {
              _id: "$author",
              postCount: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "author",
            },
          },
          { $unwind: "$author" },
          {
            $project: {
              author: {
                username: "$author.username",
                profile: "$author.profile",
              },
              postCount: 1,
            },
          },
          { $sort: { postCount: -1 } },
          { $limit: 10 },
        ]),
        Post.aggregate([
          {
            $lookup: {
              from: "interactions",
              localField: "_id",
              foreignField: "post",
              as: "interactions",
            },
          },
          {
            $addFields: {
              interactionCount: { $size: "$interactions" },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "author",
              foreignField: "_id",
              as: "author",
            },
          },
          { $unwind: "$author" },
          {
            $project: {
              title: 1,
              author: {
                username: "$author.username",
              },
              interactionCount: 1,
              createdAt: 1,
            },
          },
          { $sort: { interactionCount: -1 } },
          { $limit: 10 },
        ]),
      ]);

    res.json({
      postTrends,
      interactionTrends,
      topAuthors,
      topPosts,
      period,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Get content analytics error:", error);
    res.status(500).json({ error: "Failed to fetch content analytics" });
  }
});

// ===== SYSTEM MANAGEMENT ROUTES =====

// System health check
router.get("/system/health", async (req, res) => {
  try {
    const [dbStats, memoryUsage] = await Promise.all([
      // Database statistics
      Promise.all([
        User.estimatedDocumentCount(),
        Post.estimatedDocumentCount(),
        Interaction.estimatedDocumentCount(),
      ]),
      // Memory usage (if available)
      process.memoryUsage(),
    ]);

    res.json({
      status: "healthy",
      database: {
        users: dbStats[0],
        posts: dbStats[1],
        interactions: dbStats[2],
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
      },
      uptime: Math.round(process.uptime()) + " seconds",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("System health check error:", error);
    res.status(500).json({
      status: "unhealthy",
      error: "Failed to perform health check",
      timestamp: new Date(),
    });
  }
});

// Database cleanup operations
router.post("/system/cleanup", async (req, res) => {
  try {
    const { operation } = req.body;

    let result = {};

    switch (operation) {
      case "orphaned-interactions":
        // Remove interactions for deleted posts
        const orphanedInteractions = await Interaction.aggregate([
          {
            $lookup: {
              from: "posts",
              localField: "post",
              foreignField: "_id",
              as: "postExists",
            },
          },
          {
            $match: { postExists: { $size: 0 } },
          },
        ]);

        const deletedInteractions = await Interaction.deleteMany({
          _id: { $in: orphanedInteractions.map((i) => i._id) },
        });

        result = { deletedInteractions: deletedInteractions.deletedCount };
        break;

      case "inactive-users":
        // Deactivate users who haven't logged in for 6 months
        const sixMonthsAgo = new Date(
          Date.now() - 6 * 30 * 24 * 60 * 60 * 1000
        );
        const deactivatedUsers = await User.updateMany(
          {
            lastLogin: { $lt: sixMonthsAgo },
            isActive: true,
            role: "user", // Don't deactivate admins automatically
          },
          { isActive: false }
        );

        result = { deactivatedUsers: deactivatedUsers.modifiedCount };
        break;

      default:
        return res.status(400).json({ error: "Invalid cleanup operation" });
    }

    res.json({
      message: "Cleanup operation completed",
      operation,
      result,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Cleanup operation error:", error);
    res.status(500).json({ error: "Failed to perform cleanup operation" });
  }
});

module.exports = router;
