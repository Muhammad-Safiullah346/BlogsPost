const { rolePermissions } = require("./../config/permissions.js");

const checkPermission = (resource, action) => {
  return (req, res, next) => {
    const userRole = req.userRole || "unknown";
    const userPermissions = rolePermissions[userRole];

    if (!userPermissions || !userPermissions[resource]) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!userPermissions[resource].includes(action)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};

const checkOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user?._id;

      // Skip ownership check for superadmin and admin
      if (req.userRole === "superadmin" || req.userRole === "admin") {
        return next();
      }

      const resource = await model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }

      // Check if user owns the resource
      const ownerId = resource.author || resource.user;
      if (ownerId.toString() !== userId.toString()) {
        return res.status(403).json({
          error: "Access denied: You can only modify your own resources",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  };
};

module.exports = { checkPermission, checkOwnership };
