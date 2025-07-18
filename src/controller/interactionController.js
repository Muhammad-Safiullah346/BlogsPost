const Interaction = require("./../models/Interaction.js");
const Post = require("./../models/Post.js");

const createInteraction = async (req, res) => {
  try {
    const postId = req.params.id;
    const commentId = commentId; // For comment interactions
    const { type, content } = req.body;

    // For likes, check if user already liked the post or comment
    if (type === "like") {
      const existingLike = await Interaction.findOne({
        user: req.user._id,
        post: postId,
        type: "like",
        parentComment: commentId || null,
      });

      if (existingLike) {
        // Remove the existing like (toggle off)
        await Interaction.findByIdAndUpdate(existingLike._id, {
          isActive: false,
        });

        // Update post counters (only for direct post interactions)
        if (!commentId) {
          await Post.findByIdAndUpdate(postId, {
            $inc: { likesCount: -1 },
          });
        }

        // If this was a like on a comment, update comment's like count
        if (commentId) {
          await Interaction.findByIdAndUpdate(commentId, {
            $inc: { likesCount: -1 },
          });
        }

        return res.status(200).json({
          message: commentId
            ? "Comment like removed successfully"
            : "Post like removed successfully",
          action: "removed",
          likeId: existingLike._id,
        });
      }
    }

    // Create new interaction (like or comment)
    const interaction = new Interaction({
      user: req.user._id,
      post: postId,
      type,
      content,
      parentComment: commentId || null,
    });

    await interaction.save();
    await interaction.populate("user", "username profile");

    // Update post counters (only for direct post interactions)
    if (!commentId) {
      const updateField =
        type === "like"
          ? "likesCount"
          : type === "comment"
          ? "commentsCount"
          : "repostsCount";

      await Post.findByIdAndUpdate(postId, {
        $inc: { [updateField]: 1 },
      });
    }

    // If this is an interaction on a comment, update its counters
    if (commentId && (type === "like" || type === "comment")) {
      await Interaction.findByIdAndUpdate(commentId, {
        $inc: {
          likesCount: type === "like" ? 1 : 0,
          repliesCount: type === "comment" ? 1 : 0,
        },
      });
    }

    res.status(201).json({
      message: `${type} created successfully`,
      action: "created",
      interaction,
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to create ${req.body.type}` });
  }
};

const verifyComment = async (req, res) => {
  try {
    const parentInteraction = await Interaction.findById(req.params.commentId);
    if (!parentInteraction) {
      return res.status(404).json({ error: "Parent comment not found" });
    } else if (parentInteraction.post.toString() !== req.resource._id) {
      return res
        .status(400)
        .json({ error: "Parent comment does not belong to this post" });
    } else if (parentInteraction.type !== "comment") {
      return res.status(400).json({ error: "Can only interact with comments" });
    } else if (!parentInteraction.isActive) {
      return res
        .status(400)
        .json({ error: "Cannot interact with deleted comments" });
    }
    req.response = parentInteraction;
    next();
  } catch (error) {
    res.status(500).json({ error: "Failed to verify comment" });
  }
};

const getInteractions = async (req, res) => {
  try {
    const postId = req.params.id;
    const commentId = commentId; // For comment interactions
    const { page = 1, limit = 20, type } = req.query;

    // Get post from middleware or fetch it
    let post = req.resource;

    // Determine the parentComment filter based on route
    const parentCommentFilter = commentId || null;

    // If no type specified, return only counts
    if (!type) {
      const countsPipeline = [
        {
          $match: {
            post: post._id,
            isActive: true,
            parentComment: parentCommentFilter,
          },
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
          },
        },
      ];

      const countsResult = await Interaction.aggregate(countsPipeline);
      const counts = {
        likes: 0,
        comments: 0,
      };

      countsResult.forEach((item) => {
        counts[item._id + "s"] = item.count;
      });

      return res.json(counts);
    }

    // Validate type parameter
    if (!["like", "comment"].includes(type)) {
      return res.status(400).json({
        error: "Invalid type. Must be one of: like, comment",
      });
    }

    // Build aggregation pipeline for specific type
    const pipeline = [
      {
        $match: {
          post: post._id,
          isActive: true,
          type: type,
          parentComment: parentCommentFilter,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                username: 1,
                profile: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$user",
      },
    ];

    // Add specific fields based on interaction type
    if (type === "comment") {
      // For comments, add reply count and like count
      pipeline.push(
        {
          $lookup: {
            from: "interactions",
            let: { commentId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$parentComment", "$$commentId"] },
                      { $eq: ["$isActive", true] },
                      { $eq: ["$type", "comment"] },
                    ],
                  },
                },
              },
              { $count: "count" },
            ],
            as: "repliesCount",
          },
        },
        {
          $lookup: {
            from: "interactions",
            let: { commentId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$parentComment", "$$commentId"] },
                      { $eq: ["$isActive", true] },
                      { $eq: ["$type", "like"] },
                    ],
                  },
                },
              },
              { $count: "count" },
            ],
            as: "likesCount",
          },
        },
        {
          $project: {
            _id: 1,
            content: 1,
            user: 1,
            createdAt: 1,
            updatedAt: 1,
            repliesCount: {
              $cond: {
                if: { $eq: [{ $size: "$repliesCount" }, 0] },
                then: 0,
                else: { $arrayElemAt: ["$repliesCount.count", 0] },
              },
            },
            likesCount: {
              $cond: {
                if: { $eq: [{ $size: "$likesCount" }, 0] },
                then: 0,
                else: { $arrayElemAt: ["$likesCount.count", 0] },
              },
            },
          },
        }
      );
    } else {
      // For likes, minimal info
      pipeline.push({
        $project: {
          _id: 1,
          user: 1,
          createdAt: 1,
        },
      });
    }

    // Add sorting
    pipeline.push({
      $sort: { createdAt: -1 },
    });

    // Add pagination
    const paginationPipeline = [
      ...pipeline,
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: parseInt(limit) }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    // Execute aggregation
    const result = await Interaction.aggregate(paginationPipeline);
    const interactions = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    res.json({
      [type + "s"]: interactions, // likes, comments, or reposts
    });
  } catch (error) {
    console.error("Get interactions error:", error);
    res.status(500).json({ error: "Failed to fetch interactions" });
  }
};

const updateInteraction = async (req, res) => {
  try {
    const { id } = req.params.id;
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
    const { id } = req.params.id;

    const interaction = await Interaction.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!interaction) {
      return res.status(404).json({ error: "Interaction not found" });
    }

    // Update post counters only for direct post interactions
    if (!interaction.parentComment) {
      const updateField =
        interaction.type === "like"
          ? "likesCount"
          : interaction.type === "comment"
          ? "commentsCount"
          : "repostsCount";

      await Post.findByIdAndUpdate(interaction.post, {
        $inc: { [updateField]: -1 },
      });
    }

    // If this was an interaction on a comment, update its counters
    if (
      interaction.parentComment &&
      (interaction.type === "like" || interaction.type === "comment")
    ) {
      await Interaction.findByIdAndUpdate(interaction.parentComment, {
        $inc: {
          likesCount: interaction.type === "like" ? -1 : 0,
          repliesCount: interaction.type === "comment" ? -1 : 0,
        },
      });
    }

    res.json({ message: "Interaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete interaction" });
  }
};

// Get user's interaction history
const getInteractionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;

    // Base query for user's interactions
    const query = {
      user: req.user._id,
      isActive: true,
    };

    // Filter by interaction type if specified
    if (type && ["like", "comment", "repost"].includes(type)) {
      query.type = type;
    }

    // Get interactions with populated references
    const interactions = await Interaction.find(query)
      .populate({
        path: "post",
        select: "title author status",
        populate: {
          path: "author",
          select: "username profile",
        },
      })
      .populate({
        path: "parentComment",
        select: "content user",
        populate: {
          path: "user",
          select: "username profile",
        },
      })
      .populate("user", "username profile")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter out interactions on non-published posts for regular users
    const filteredInteractions = interactions.filter((interaction) => {
      const post = interaction.post;
      return (
        post.status === "published" ||
        req.userRole !== "user" ||
        post.author._id.toString() === req.user._id.toString()
      );
    });

    const total = await Interaction.countDocuments(query);

    res.json({
      interactions: filteredInteractions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch interaction history" });
  }
};

module.exports = {
  createInteraction,
  getInteractions,
  updateInteraction,
  deleteInteraction,
  getInteractionHistory,
  verifyComment,
};
