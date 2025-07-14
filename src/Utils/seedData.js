const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");
const Interaction = require("../models/Interaction");
require("dotenv").config();
require("./config/dbConnect.js");

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Post.deleteMany({});
    await Interaction.deleteMany({});

    // Create users
    const superadmin = new User({
      username: "superadmin",
      email: "superadmin@blog.com",
      password: "password123",
      role: "superadmin",
      profile: {
        firstName: "Super",
        lastName: "Admin",
        bio: "System administrator",
      },
    });

    const admin = new User({
      username: "admin",
      email: "admin@blog.com",
      password: "password123",
      role: "admin",
      profile: {
        firstName: "Admin",
        lastName: "User",
        bio: "Content administrator",
      },
    });

    const user1 = new User({
      username: "john_doe",
      email: "john@blog.com",
      password: "password123",
      role: "user",
      profile: {
        firstName: "John",
        lastName: "Doe",
        bio: "Tech enthusiast and blogger",
      },
    });

    const user2 = new User({
      username: "jane_smith",
      email: "jane@blog.com",
      password: "password123",
      role: "user",
      profile: {
        firstName: "Jane",
        lastName: "Smith",
        bio: "Content creator and writer",
      },
    });

    await Promise.all([
      superadmin.save(),
      admin.save(),
      user1.save(),
      user2.save(),
    ]);

    // Create posts
    const post1 = new Post({
      title: "Getting Started with Node.js",
      content:
        "This is a comprehensive guide to getting started with Node.js development...",
      author: user1._id,
      status: "published",
      tags: ["nodejs", "javascript", "tutorial"],
      excerpt: "Learn the basics of Node.js development",
    });

    const post2 = new Post({
      title: "Building REST APIs with Express",
      content: "Express.js is a powerful framework for building REST APIs...",
      author: user2._id,
      status: "published",
      tags: ["express", "api", "nodejs"],
      excerpt: "Master REST API development with Express",
    });

    const post3 = new Post({
      title: "Draft Post",
      content: "This is a draft post that is not yet published...",
      author: user1._id,
      status: "draft",
      tags: ["draft"],
      excerpt: "A draft post for testing",
    });

    await Promise.all([post1.save(), post2.save(), post3.save()]);

    // Create interactions
    const like1 = new Interaction({
      user: user2._id,
      post: post1._id,
      type: "like",
    });

    const comment1 = new Interaction({
      user: user2._id,
      post: post1._id,
      type: "comment",
      content: "Great tutorial! Very helpful for beginners.",
    });

    const comment2 = new Interaction({
      user: user1._id,
      post: post2._id,
      type: "comment",
      content: "Thanks for sharing this. Express is indeed powerful!",
    });

    await Promise.all([like1.save(), comment1.save(), comment2.save()]);

    // Update post counters
    await Post.findByIdAndUpdate(post1._id, {
      likesCount: 1,
      commentsCount: 1,
    });

    await Post.findByIdAndUpdate(post2._id, {
      commentsCount: 1,
    });

    console.log("Seed data created successfully!");
    console.log("Users created:");
    console.log("- superadmin@blog.com (superadmin)");
    console.log("- admin@blog.com (admin)");
    console.log("- john@blog.com (user)");
    console.log("- jane@blog.com (user)");
    console.log("All passwords: password123");
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await mongoose.connection.close();
  }
};

// Run if called directly
if (require.main === module) {
  seedData();
}

module.exports = seedData;
