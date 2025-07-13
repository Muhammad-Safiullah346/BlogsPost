const Interaction = require("./../models/Interaction.js");
const Post = require("./../models/Post.js");

const createInteraction = async (req, res) => {
  try {
    const { postId } = req.params;
    const { type, content, parentComment } = req.body;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // For likes, check if user already liked
    if (type === "like") {
      const existingLike = await Interaction.findOne({
        user: req.user._id,
        post: postId,
        type: "like",
      });

      if (existingLike) {
        return res.status(400).json({ error: "You already liked this post" });
      }
    }

    const interaction = new Interaction({
      user: req.user._id,
      post: postId,
      type,
      content,
      parentComment,
    });

    await interaction.save();
    await interaction.populate("user", "username profile");

    // Update post counters
    const updateField =
      type === "like"
        ? "likesCount"
        : type === "comment"
        ? "commentsCount"
        : "repostsCount";

    await Post.findByIdAndUpdate(postId, {
      $inc: { [updateField]: 1 },
    });

    res.status(201).json({
      message: `${type} created successfully`,
      interaction,
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to create ${req.body.type}` });
  }
};

const getInteractions = async (req, res) => {
  try {
    const { postId } = req.params;
    const { type, page = 1, limit = 10 } = req.query;

    const query = { post: postId, isActive: true };
    if (type) {
      query.type = type;
    }

    const interactions = await Interaction.find(query)
      .populate("user", "username profile")
      .populate("parentComment", "content user")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Interaction.countDocuments(query);

    res.json({
      interactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch interactions" });
  }
};

const updateInteraction = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const interaction = await Interaction.findByIdAndUpdate(
      id,
      { content },
      { new: true }
    ).populate("user", "username profile");

    if (!interaction) {
      return res.status(404).json({ error: "Interaction not found" });
    }

    res.json({ message: "Interaction updated successfully", interaction });
  } catch (error) {
    res.status(500).json({ error: "Failed to update interaction" });
  }
};

const deleteInteraction = async (req, res) => {
  try {
    const { id } = req.params;

    const interaction = await Interaction.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!interaction) {
      return res.status(404).json({ error: "Interaction not found" });
    }

    // Update post counters
    const updateField =
      interaction.type === "like"
        ? "likesCount"
        : interaction.type === "comment"
        ? "commentsCount"
        : "repostsCount";

    await Post.findByIdAndUpdate(interaction.post, {
      $inc: { [updateField]: -1 },
    });

    res.json({ message: "Interaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete interaction" });
  }
};

module.exports = {
  createInteraction,
  getInteractions,
  updateInteraction,
  deleteInteraction,
};
