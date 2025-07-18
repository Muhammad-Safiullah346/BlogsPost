const Post = require("./../models/Post.js");
const Interaction = require("./../models/Interaction.js");
const { applyConditionalFilter } = require("./../middleware/acl.js");

const createPost = async (req, res) => {
  try {
    const { title, content, tags, featuredImage, excerpt, status } = req.body;

    const post = new Post({
      title,
      content,
      author: req.user._id,
      tags,
      featuredImage,
      excerpt,
      status,
    });

    await post.save();
    await post.populate("author", "username profile");
    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create post" });
  }
};

const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, author, tag, filter } = req.query;

    let query = {};

    // Apply conditional filters based on user role and permissions
    query = applyConditionalFilter(query, req);

    // Handle special filters for owner view
    if (req.ownerView && filter) {
      if (filter === "liked") {
        return getLikedPosts(req, res);
      }

      if (filter === "commented") {
        return getCommentedPosts(req, res);
      }
    }

    // Apply additional filters
    if (status && !req.publishedOnly) {
      // Only allow status filtering if not restricted to published only
      if (req.userRole === "user") {
        // For owner view, users can filter their own posts by any status
        if (req.ownerView) {
          // User is already filtered by author from conditional filters
          if (["published", "draft", "archived"].includes(status)) {
            query.status = status;
          }
        } else {
          // For public view, users can only filter published posts or their own posts
          if (status !== "published") {
            // If filtering non-published, must be their own posts
            query.author = req.user._id;
          }
          query.status = status;
        }
      } else if (req.userRole === "admin" || req.userRole === "superadmin") {
        // Admins and superadmins can filter by any status
        query.status = status;
      }
    }

    if (author && !req.ownerView) {
      // Only allow author filtering in public view, not owner view
      query.author = author;
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    const posts = await Post.find(query)
      .populate("author", "username profile")
      .populate("originalPost", "title author")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

const getPost = async (req, res) => {
  try {
    // If resource is already loaded by middleware, use it
    let post = req.resource;

    if (!post) {
      const { id } = req.params;
      post = await Post.findById(id)
        .populate("author", "username profile")
        .populate("originalPost", "title author");

      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
    }

    // Additional population if needed
    if (!post.author.username) {
      await post.populate("author", "username profile");
    }

    res.json({ post });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
};

const updatePost = async (req, res) => {
  try {
    const { title, content, tags, featuredImage, excerpt, status } = req.body;

    // Use the post already loaded by checkOwnership middleware
    const post = req.resource;

    // Update the post fields
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (tags !== undefined) post.tags = tags;
    if (featuredImage !== undefined) post.featuredImage = featuredImage;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (status !== undefined) post.status = status;

    // Save the updated post
    await post.save();

    // Populate author info if not already populated
    if (!post.author.username) {
      await post.populate("author", "username profile");
    }

    res.json({
      message: "Post updated successfully",
      post,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update post" });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    // Use the post already loaded by checkOwnership middleware
    const originalPost = req.resource;

    // Get repost IDs for this post
    const repostIds = await Post.find({
      originalPost: id,
      isRepost: true,
    }).distinct("_id");

    // Check if the post being deleted is a repost
    if (originalPost.isRepost && originalPost.originalPost) {
      // If it's a repost, decrement the repostsCount of the original post
      await Post.findByIdAndUpdate(originalPost.originalPost, {
        $inc: { repostsCount: -1 },
      });
    }

    // Prepare all post IDs for interaction cleanup
    const allPostIds = [id, ...repostIds];

    // Execute all deletions in parallel for maximum performance
    const [, repostDeleteResult] = await Promise.all([
      Post.deleteOne({ _id: id }),
      Post.deleteMany({ originalPost: id, isRepost: true }),
      Interaction.deleteMany({
        post: { $in: allPostIds },
      }),
    ]);

    res.json({
      message: "Post deleted successfully",
      repostsDeleted: repostDeleteResult.deletedCount,
    });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
};

const createRepost = async (req, res) => {
  try {
    const { title, comment } = req.body;

    const originalPost = req.resource;

    const repost = new Post({
      title: title || `Repost: ${originalPost.title}`,
      content: comment || "",
      author: req.user._id,
      isRepost: true,
      originalPost: originalPost._id,
      repostComment: comment,
      status: "published",
    });

    await repost.save();
    await repost.populate("author", "username profile");
    await repost.populate("originalPost", "title author");

    // Update repost count
    await Post.findByIdAndUpdate(originalPost._id, {
      $inc: { repostsCount: 1 },
    });

    res.status(201).json({
      message: "Repost created successfully",
      post: repost,
    });
  } catch (error) {
    console.error("Repost creation error:", error);
    res.status(500).json({ error: "Failed to create repost" });
  }
};

// Get user's draft posts
const getDraftPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Query for user's draft posts
    const query = {
      author: req.user._id,
      status: "draft",
    };

    const posts = await Post.find(query)
      .populate("author", "username profile")
      .populate("originalPost", "title author")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch draft posts" });
  }
};

// Get posts that the user has liked
const getLikedPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // First, find all the user's likes
    const likes = await Interaction.find({
      user: req.user._id,
      type: "like",
      isActive: true,
      parentComment: null, // Ensure we're only getting post likes, not comment likes
    }).select("post");

    const postIds = likes.map((like) => like.post);

    // Then get the actual posts
    const query = {
      _id: { $in: postIds },
      $or: [
        { status: "published" }, // Always show published posts
        { author: req.user._id }, // Show user's own posts regardless of status
      ],
    };

    const posts = await Post.find(query)
      .populate("author", "username profile")
      .populate("originalPost", "title author")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch liked posts" });
  }
};

// Get posts that the user has commented on
const getCommentedPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // First, find all the user's comments
    const comments = await Interaction.find({
      user: req.user._id,
      type: "comment",
      isActive: true,
      parentComment: null, // Only get direct post comments, not replies to comments
    }).select("post");

    // Remove duplicates (user might have commented multiple times on same post)
    const postIds = [
      ...new Set(comments.map((comment) => comment.post.toString())),
    ];

    // Then get the actual posts
    const query = {
      _id: { $in: postIds },
      $or: [
        { status: "published" }, // Always show published posts
        { author: req.user._id }, // Show user's own posts regardless of status
      ],
    };

    const posts = await Post.find(query)
      .populate("author", "username profile")
      .populate("originalPost", "title author")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch commented posts" });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  createRepost,
  getMyPosts,
  getDraftPosts,
  getLikedPosts,
  getCommentedPosts,
};
