const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: function () {
        // Content is required for regular posts, but optional for reposts
        return !this.isRepost;
      },
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    featuredImage: String,
    excerpt: String,
    isRepost: {
      type: Boolean,
      default: false,
    },
    originalPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    repostComment: String,
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    repostsCount: {
      type: Number,
      default: 0,
    },
    // New field to track if post was archived due to account deactivation
    archivedByDeactivation: {
      type: Boolean,
      default: false,
    },
    // Track previous status before deactivation
    previousStatus: {
      type: String,
      enum: ["draft", "published", "archived"],
    },
  },
  {
    timestamps: true,
  }
);

// Create slug from title - use pre-validate to run before validation
postSchema.pre("validate", function (next) {
  // Always generate slug if it doesn't exist or if title is modified
  if (!this.slug || this.isModified("title")) {
    // Generate a more robust slug
    const baseSlug =
      this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "post"; // fallback if title becomes empty

    // Add timestamp and random component for uniqueness
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    this.slug = `${baseSlug}-${timestamp}-${randomSuffix}`;
  }
  next();
});

// Indexes for better query performance
postSchema.index({ author: 1, _id: 1 }); // For ownership checks
postSchema.index({ originalPost: 1, isRepost: 1 }); // For finding reposts

module.exports = mongoose.model("Post", postSchema);
