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

module.exports = { auth, requireAuth };
