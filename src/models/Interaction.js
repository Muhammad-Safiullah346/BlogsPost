const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    type: {
      type: String,
      enum: ["like", "comment"],
      required: true,
    },
    content: {
      type: String,
      required: function () {
        return this.type === "comment";
      },
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interaction",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    repliesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate likes on posts and comments
interactionSchema.index(
  { user: 1, post: 1, parentComment: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "like" },
  }
);

// Additional indexes for better query performance
interactionSchema.index({ post: 1 }); // For deleting interactions by post

module.exports = mongoose.model("Interaction", interactionSchema);
