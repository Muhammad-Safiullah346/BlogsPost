const jwt = require("jsonwebtoken");
const User = require("./../models/User.js");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      req.user = null;
      req.userRole = "unknown";
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Check if it's a superadmin token
    if (decoded.role === "superadmin") {
      req.user = {
        id: "superadmin",
        email: process.env.SUPERADMIN_EMAIL,
        role: "superadmin",
        username: "superadmin",
      };
      req.userRole = "superadmin";
      return next();
    }

    // Regular user authentication
    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      req.user = null;
      req.userRole = "unknown";
      return next();
    }

    req.user = user;
    req.userRole = user.role;
    next();
  } catch (error) {
    req.user = null;
    req.userRole = "unknown";
    next();
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Role-based middleware
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.userRole !== "superadmin") {
    return res.status(403).json({ error: "Superadmin access required" });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (
    !req.user ||
    (req.userRole !== "admin" && req.userRole !== "superadmin")
  ) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

const requireUser = (req, res, next) => {
  if (!req.user || req.userRole === "unknown") {
    return res.status(403).json({ error: "User access required" });
  }
  next();
};

module.exports = {
  auth,
  requireAuth,
  requireSuperAdmin,
  requireAdmin,
  requireUser,
};
