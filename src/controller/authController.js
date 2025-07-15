const User = require("./../models/User.js");
const Post = require("./../models/Post.js");
const Interaction = require("./../models/Interaction.js");
const jwt = require("jsonwebtoken");

const generateToken = (userId, role = null) => {
  const payload = { id: userId };
  if (role) {
    payload.role = role;
  }
  return jwt.sign(payload, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

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
      profile: {
        firstName,
        lastName,
      },
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if it's superadmin login
    if (
      email === process.env.SUPERADMIN_EMAIL &&
      password === process.env.SUPERADMIN_PASSWORD
    ) {
      const token = generateToken("superadmin", "superadmin");
      return res.json({
        message: "Superadmin login successful",
        token,
        user: {
          id: "superadmin",
          email: process.env.SUPERADMIN_EMAIL,
          role: "superadmin",
          username: "superadmin",
        },
      });
    }

    // Find user (including deactivated ones)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    let message = "Login successful";
    let wasReactivated = false;

    // If user is deactivated, automatically reactivate
    if (!user.isActive) {
      await user.reactivate();

      // Restore posts that were archived due to deactivation
      const archivedPosts = await Post.find({
        author: user._id,
        archivedByDeactivation: true,
      });

      for (const post of archivedPosts) {
        await Post.findByIdAndUpdate(post._id, {
          status: post.previousStatus || "draft",
          $unset: {
            archivedByDeactivation: 1,
            previousStatus: 1,
          },
        });
      }

      // Reactivate interactions
      await Interaction.updateMany({ user: user._id }, { isActive: true });

      message = "Account reactivated and login successful";
      wasReactivated = true;
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message,
      token,
      wasReactivated,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, bio } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          "profile.firstName": firstName,
          "profile.lastName": lastName,
          "profile.bio": bio,
        },
      },
      { new: true }
    ).select("-password");

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile" });
  }
};

const deactivateAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Store previous status of posts before archiving them
    const userPosts = await Post.find({ author: userId });

    // Archive all user's posts and store their previous status
    for (const post of userPosts) {
      if (post.status !== "archived") {
        await Post.findByIdAndUpdate(post._id, {
          previousStatus: post.status,
          status: "archived",
          archivedByDeactivation: true,
        });
      }
    }

    // Deactivate user account
    await user.deactivate();

    await Interaction.updateMany({ user: userId }, { isActive: false });

    res.json({
      message:
        "Account deactivated successfully. You can reactivate it anytime by logging in with your credentials.",
    });
  } catch (error) {
    console.error("Deactivation error:", error);
    res.status(500).json({ error: "Failed to deactivate account" });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password, confirmDelete } = req.body;

    // Verify password for security
    const user = await User.findById(userId);
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Require explicit confirmation
    if (confirmDelete !== "DELETE_MY_ACCOUNT") {
      return res.status(400).json({
        error:
          "Please confirm deletion by sending confirmDelete: 'DELETE_MY_ACCOUNT'",
      });
    }

    // Delete user's interactions
    await Interaction.deleteMany({ user: userId });

    // Get user's posts before deletion to handle reposts
    const userPosts = await Post.find({ author: userId });
    const userPostIds = userPosts.map((post) => post._id);

    // Delete reposts that reference user's posts
    if (userPostIds.length > 0) {
      const reposts = await Post.find({
        originalPost: { $in: userPostIds },
        isRepost: true,
      });

      if (reposts.length > 0) {
        const repostIds = reposts.map((repost) => repost._id);
        // Delete interactions on reposts
        await Interaction.deleteMany({ post: { $in: repostIds } });
        // Delete the reposts themselves
        await Post.deleteMany({
          originalPost: { $in: userPostIds },
          isRepost: true,
        });
      }
    }

    // Delete user's posts
    await Post.deleteMany({ author: userId });

    // Delete the user account
    await User.findByIdAndDelete(userId);

    res.json({
      message: "Account and all associated data deleted successfully",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
};

// Admin management functions (only for superadmin)
const promoteToAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ error: "User is already an admin" });
    }

    user.role = "admin";
    await user.save();

    res.json({
      message: "User promoted to admin successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Promote to admin error:", error);
    res.status(500).json({ error: "Failed to promote user to admin" });
  }
};

const demoteToUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "user") {
      return res.status(400).json({ error: "User is already a regular user" });
    }

    user.role = "user";
    await user.save();

    res.json({
      message: "Admin demoted to user successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Demote to user error:", error);
    res.status(500).json({ error: "Failed to demote admin to user" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;
    const query = {};

    if (role && ["admin", "user"].includes(role)) {
      query.role = role;
    }

    const users = await User.find(query)
      .select("-password")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  deactivateAccount,
  deleteAccount,
  promoteToAdmin,
  demoteToUser,
  getAllUsers,
};
