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
      enum: ["like", "comment", "repost"],
      required: true,
    },
    content: {
      type: String,
      required: function () {
        return this.type === "comment" || this.type === "repost";
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
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate likes
interactionSchema.index(
  { user: 1, post: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "like" },
  }
);

module.exports = mongoose.model("Interaction", interactionSchema);
