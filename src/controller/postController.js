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
    const { page = 1, limit = 10, status, author, tag } = req.query;

    let query = {};

    // Apply conditional filters based on user role and permissions
    query = applyConditionalFilter(query, req);

    // Apply additional filters
    if (status && !req.publishedOnly) {
      // Only allow status filtering if not restricted to published only
      if (req.userRole === "user") {
        // Users can only filter their own non-published posts
        if (status !== "published") {
          query.author = req.user._id;
        }
      }
      query.status = status;
    }

    if (author) {
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
    const { id } = req.params;
    const { title, content, tags, featuredImage, excerpt, status } = req.body;

    // Use resource from middleware if available
    let post = req.resource;

    if (!post) {
      post = await Post.findByIdAndUpdate(
        id,
        { title, content, tags, featuredImage, excerpt, status },
        { new: true }
      ).populate("author", "username profile");
    } else {
      // Update the existing resource
      Object.assign(post, {
        title,
        content,
        tags,
        featuredImage,
        excerpt,
        status,
      });
      await post.save();
      await post.populate("author", "username profile");
    }

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ message: "Post updated successfully", post });
  } catch (error) {
    res.status(500).json({ error: "Failed to update post" });
  }
};

const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    // Use resource from middleware if available
    let post = req.resource;

    if (!post) {
      post = await Post.findByIdAndDelete(id);
    } else {
      await Post.findByIdAndDelete(id);
    }

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Delete associated interactions
    await Interaction.deleteMany({ post: id });

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete post" });
  }
};

const createRepost = async (req, res) => {
  try {
    const { originalPostId, comment } = req.body;

    const originalPost = await Post.findById(originalPostId);
    if (!originalPost) {
      return res.status(404).json({ error: "Original post not found" });
    }

    // Check if user can repost based on original post status
    if (originalPost.status === "archived") {
      // Only the author, admin, and superadmin can repost archived posts
      if (
        req.userRole === "user" &&
        originalPost.author.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          error: "Cannot repost archived content",
        });
      }
    } else if (originalPost.status === "draft") {
      // Only the author, admin, and superadmin can repost draft posts
      if (
        req.userRole === "user" &&
        originalPost.author.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          error: "Cannot repost draft content",
        });
      }
    } else if (originalPost.status !== "published" && req.userRole === "user") {
      return res.status(403).json({
        error: "Can only repost published content",
      });
    }

    const repost = new Post({
      title: `Repost: ${originalPost.title}`,
      content: comment || "",
      author: req.user._id,
      isRepost: true,
      originalPost: originalPostId,
      repostComment: comment,
      status: "published",
    });

    await repost.save();
    await repost.populate("author", "username profile");
    await repost.populate("originalPost", "title author");

    // Update repost count
    await Post.findByIdAndUpdate(originalPostId, {
      $inc: { repostsCount: 1 },
    });

    res.status(201).json({
      message: "Repost created successfully",
      post: repost,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create repost" });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  createRepost,
};
