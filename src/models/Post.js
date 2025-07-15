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
      required: true,
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

// Create slug from title
postSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug =
      this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") +
      "-" +
      Date.now();
  }
  next();
});

module.exports = mongoose.model("Post", postSchema);
