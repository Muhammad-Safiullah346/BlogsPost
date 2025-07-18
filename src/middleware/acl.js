const {
  rolePermissions,
  conditionalPermissions,
  moderationPermissions,
} = require("./../config/permissions.js");

const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const userRole = req.userRole || "unknown";
      const userPermissions = rolePermissions[userRole];

      // Check if role has access to this resource
      if (!userPermissions || !userPermissions[resource]) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if role has permission for this action
      const permissionLevel = userPermissions[resource][action];
      if (!permissionLevel) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      // Handle different permission levels
      switch (permissionLevel) {
        case "any":
          // Full access, no restrictions (mainly for superadmin)
          return next();

        case "own":
          // Check ownership in the next middleware or controller
          req.requireOwnership = true;
          return next();

        case "published_only":
          // Only published content (handled in controller)
          req.publishedOnly = true;
          return next();

        case "conditional":
          // Handle conditional permissions
          req.conditionalPermission = {
            resource,
            action,
            condition: conditionalPermissions[resource]?.[action]?.[userRole],
          };
          return next();

        case "moderate":
          // Handle moderation permissions
          req.moderationPermission = {
            resource,
            action,
            condition: moderationPermissions[resource]?.[action]?.[userRole],
          };
          return next();

        default:
          return res.status(403).json({ error: "Invalid permission level" });
      }
    } catch (error) {
      return res.status(500).json({ error: "Permission check failed" });
    }
  };
};

const checkOwnership = (model, ownerField = null) => {
  return async (req, res, next) => {
    try {
      if (!req.requireOwnership) {
        return next();
      }

      const resourceId = req.params.id;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Optimized query with select to minimize data transfer
      const query = model.findById(resourceId);
      if (model.modelName === "Post" && ownerField === "author") {
        query.populate("author", "role username profile"); // Include profile for controller use
      }

      const resource = await query;
      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      // Determine owner field
      const ownerFieldName =
        ownerField || (resource.author ? "author" : "user");
      const ownerId = resource[ownerFieldName];

      if (!ownerId || ownerId.toString() !== userId.toString()) {
        return res.status(403).json({
          error: "Access denied: You can only access your own resources",
        });
      }

      // Store resource in request for controller use
      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({ error: "Ownership check failed" });
    }
  };
};

const checkConditionalPermission = (model, ownerField = null) => {
  return async (req, res, next) => {
    try {
      // Skip if no conditional permission required and no publishedOnly flag
      if (!req.conditionalPermission && !req.publishedOnly) {
        return next();
      }

      let resource;

      // For single resource requests
      if (req.params.id) {
        resource = await model.findById(req.params.id);
        if (!resource) {
          return res.status(404).json({ error: "Resource not found" });
        }

        // Check publishedOnly restriction unless ownerView is true
        if (req.publishedOnly && !req.ownerView) {
          if (resource.status !== "published") {
            return res.status(403).json({ error: "Access denied" });
          }
        }

        // Check conditional permission (for regular users)
        if (req.conditionalPermission) {
          const { condition } = req.conditionalPermission;
          if (!condition) {
            return res.status(403).json({ error: "Access denied" });
          }

          const hasAccess = condition(resource, req.user, req);
          if (!hasAccess) {
            return res.status(403).json({ error: "Access denied" });
          }
        }

        req.resource = resource;
        // For list requests (no specific ID), query database and set resources
      } // For list requests (no specific ID), query database and set resources
      else if (!req.params.id) {
        let query = {};

        if (req.conditionalPermission) {
          const { condition } = req.conditionalPermission;

          if (condition && req.userRole === "user") {
            // Build query based on what the condition would allow
            if (req.ownerView) {
              // For owner view (/me/posts), show only user's own posts (all statuses)
              query.author = req.user._id;
            } else {
              // For public view (/posts), show only published posts
              query.status = "published";
            }
          }
        }

        if (req.publishedOnly && !req.ownerView) {
          // For unknown users or when explicitly restricted to published only
          query.status = "published";
        }

        // Query database and set resources
        const resources = await model
          .find(query)
          .populate("author", "username profile")
          .populate("originalPost", "title author")
          .sort({ createdAt: -1 });

        req.resource = resources;
      }

      next();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Conditional permission check failed" });
    }
  };
};

// New middleware for moderation permissions
const checkModerationPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const userRole = req.userRole || "unknown";
      const userPermissions = rolePermissions[userRole];

      // Check if role has access to this resource
      if (!userPermissions || !userPermissions[resource]) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if role has permission for this action
      const permissionLevel = userPermissions[resource][action];
      if (permissionLevel !== "moderate") {
        return res
          .status(403)
          .json({ error: "Moderation permission required" });
      }

      // Get the moderation condition
      const condition = moderationPermissions[resource]?.[action]?.[userRole];
      if (!condition) {
        return res
          .status(403)
          .json({ error: "No moderation condition defined" });
      }

      // Store moderation permission for later use
      req.moderationPermission = {
        resource,
        action,
        condition,
      };

      next();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Moderation permission check failed" });
    }
  };
};

// Middleware to check moderation condition against actual resource
const checkModerationCondition = (model, ownerField = null) => {
  return async (req, res, next) => {
    try {
      // Skip if no moderation permission required
      if (!req.moderationPermission) {
        return next();
      }

      const { condition } = req.moderationPermission;
      const resourceId = req.params.id;

      if (!resourceId) {
        return res.status(400).json({ error: "Resource ID required" });
      }

      // For posts, populate author to get role information for permission checks
      const query = model.findById(resourceId);
      if (model.modelName === "Post") {
        query.populate("author", "role username");
      }
      // For interactions (comments), populate user and post.author for moderation
      if (model.modelName === "Interaction") {
        query.populate("user", "role username").populate("post", "author");
      }
      // For users, no population needed
      if (model.modelName === "User") {
        // No population needed for users
      }

      const resource = await query;
      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      // Check if user can moderate this resource
      if (condition && !condition(resource, req.user)) {
        return res.status(403).json({ error: "Moderation access denied" });
      }

      // Store resource in request for use in controller
      req.resource = resource;
      next();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Moderation condition check failed" });
    }
  };
};

// Enhanced function to check interaction permissions for specific posts
const checkInteractionPermission = (action) => {
  return async (req, res, next) => {
    try {
      const { postId } = req.params;
      const userRole = req.userRole || "unknown";
      const Post = require("./../models/Post.js");

      // Get the post to check its status
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Check based on user role and post status
      if (userRole === "superadmin") {
        // Superadmin can perform any action but interactions are still personal
        if (action === "Create" && post.status === "draft") {
          return res.status(403).json({
            error:
              "Cannot interact with draft posts. Please publish the post first.",
          });
        }
        req.post = post;
        return next();
      }

      if (userRole === "admin") {
        // Admin can read all interactions but create/update/delete are personal or moderation
        if (action === "Read") {
          req.post = post;
          return next();
        }

        if (action === "Create" && post.status === "draft") {
          return res.status(403).json({
            error:
              "Cannot interact with draft posts. Please publish the post first.",
          });
        }

        req.post = post;
        return next();
      }

      // Draft posts cannot be interacted with by anyone (including author)
      if (post.status === "draft") {
        return res.status(403).json({
          error:
            "Cannot interact with draft posts. Please publish the post first.",
        });
      }

      if (userRole === "user") {
        // For published posts, users can interact normally
        if (post.status === "published") {
          req.post = post;
          return next();
        }

        // For archived posts, check if user is the author
        if (post.status === "archived") {
          if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({
              error: "Cannot interact with archived posts that are not yours",
            });
          }
          req.post = post;
          return next();
        }

        // For any other status, deny access
        return res.status(403).json({ error: "Access denied" });
      }

      if (userRole === "unknown") {
        // Unknown users can only interact with published posts
        if (post.status === "published") {
          req.post = post;
          return next();
        }
        return res.status(403).json({ error: "Access denied" });
      }

      // Default deny
      return res.status(403).json({ error: "Access denied" });
    } catch (error) {
      return res.status(500).json({ error: "Permission check failed" });
    }
  };
};

// Helper function to apply conditional filters in controllers
const applyConditionalFilter = (query, req) => {
  if (req.conditionalPermission) {
    const { resource, action } = req.conditionalPermission;

    // Apply filters based on resource and action
    if (resource === "posts" && action === "Read") {
      if (req.userRole === "user") {
        // Users can see all published posts OR their own posts (draft/archived)
        query.$or = [{ status: "published" }, { author: req.user._id }];
      }
    }
  }

  if (req.publishedOnly) {
    query.status = "published";
  }

  return query;
};

module.exports = {
  checkPermission,
  checkOwnership,
  checkConditionalPermission,
  checkModerationPermission,
  checkInteractionPermission,
  applyConditionalFilter,
};
