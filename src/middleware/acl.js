const {
  rolePermissions,
  conditionalPermissions,
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
          // Full access, no restrictions
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
      // Skip ownership check if not required
      if (!req.requireOwnership) {
        return next();
      }

      const resourceId = req.params.id;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const resource = await model.findById(resourceId);
      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      // Determine owner field (author, user, or custom field)
      const ownerFieldName =
        ownerField || (resource.author ? "author" : "user");
      const ownerId = resource[ownerFieldName];

      if (!ownerId || ownerId.toString() !== userId.toString()) {
        return res.status(403).json({
          error: "Access denied: You can only access your own resources",
        });
      }

      // Store resource in request for use in controller
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
      // Skip if no conditional permission required
      if (!req.conditionalPermission) {
        return next();
      }

      const { condition } = req.conditionalPermission;
      if (!condition) {
        return res.status(403).json({ error: "Access denied" });
      }

      let resource;

      // For single resource requests
      if (req.params.id) {
        resource = await model.findById(req.params.id);
        if (!resource) {
          return res.status(404).json({ error: "Resource not found" });
        }

        // Check condition
        const hasAccess = condition(resource, req.user);
        if (!hasAccess) {
          return res.status(403).json({ error: "Access denied" });
        }

        req.resource = resource;
      }

      // For list requests, condition will be applied in controller
      next();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Conditional permission check failed" });
    }
  };
};

// Enhanced function to check interaction permissions for specific posts
const checkInteractionPermission = (action) => {
  return async (req, res, next) => {
    try {
      const { postId } = req.params;
      const userRole = req.userRole || "unknown";
      const Post = require("../models/Post");

      // Get the post to check its status
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Check based on user role and post status
      if (userRole === "superadmin" || userRole === "admin") {
        // Superadmin and admin can perform any action
        req.post = post;
        return next();
      }

      // NEW LOGIC: Draft posts cannot be interacted with by anyone (including author)
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
  checkInteractionPermission,
  applyConditionalFilter,
};
