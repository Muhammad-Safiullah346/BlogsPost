const rolePermissions = {
  superadmin: {
    posts: {
      Read: "any",
      Delete: "any",
    },
    reposts: {
      Read: "any",
      Delete: "any",
    },
    interactions: {
      Read: "any",
      Delete: "any",
    },
    likes: {
      Read: "any",
      Delete: "any",
    },
    comments: {
      Read: "any",
      Delete: "any",
    },
    users: {
      Create: "any",
      Read: "any",
      Delete: "any", // Can delete any user account
      Deactivate: "any", // Can deactivate any user account
    },
  },
  admin: {
    posts: {
      Create: "own",
      Read: "any",
      Update: "own",
      Delete: "moderate",
    },
    reposts: {
      Create: "own",
      Read: "any",
      Update: "own",
      Delete: "moderate",
    },
    interactions: {
      Create: "own",
      Read: "any",
      Update: "own",
      Delete: "moderate",
    },
    likes: {
      Create: "own",
      Read: "any",
      Delete: "own",
    },
    comments: {
      Create: "own",
      Read: "any",
      Update: "own",
      Delete: "own",
    },
    users: {
      Read: "any",
      Update: "own",
      Delete: "moderate", // Can delete regular users
      Deactivate: "moderate", // Can deactivate regular users
    },
  },
  user: {
    posts: {
      Create: "own",
      Read: "conditional",
      Update: "own",
      Delete: "own",
    },
    reposts: {
      Create: "own",
      Read: "conditional",
      Update: "own",
      Delete: "own",
    },
    interactions: {
      Create: "conditional",
      Read: "conditional",
      Update: "own",
      Delete: "own",
    },
    likes: {
      Create: "conditional",
      Read: "conditional",
      Delete: "own",
    },
    comments: {
      Create: "conditional",
      Read: "conditional",
      Update: "own",
      Delete: "moderate",
    },
    users: {
      Read: "own",
      Update: "own",
      Delete: "own", // Can delete their own account
      Deactivate: "own", // Can deactivate their own account
    },
  },
  unknown: {
    posts: {
      Read: "published_only",
    },
    reposts: {
      Read: "published_only",
    },
    interactions: {
      Read: "published_only",
    },
    likes: {
      Read: "published_only",
    },
    comments: {
      Read: "published_only",
    },
    users: {}, // No access to user profiles
  },
};

// Special conditions for conditional permissions
const conditionalPermissions = {
  posts: {
    Read: {
      user: (post, user) => {
        if (post.status === "published") return true;
        return post.author.toString() === user._id.toString();
      },
    },
  },
  reposts: {
    Create: {
      user: (post, user) => {
        return post.status === "published";
      },
    },
    Read: {
      user: (post, user) => {
        if (post.status === "published") return true;
        return post.author.toString() === user._id.toString();
      },
    },
  },
  interactions: {
    Create: {
      user: (post, user) => {
        return post.status === "published";
      },
    },
    Read: {
      user: (post, user) => {
        if (post.status === "published") return true;
        return post.author.toString() === user._id.toString();
      },
    },
  },
  likes: {
    Create: {
      user: (post, user) => {
        return post.status === "published";
      },
    },
    Read: {
      user: (post, user) => {
        if (post.status === "published") return true;
        return post.author.toString() === user._id.toString();
      },
    },
  },
  comments: {
    Create: {
      user: (post, user) => {
        return post.status === "published";
      },
    },
    Read: {
      user: (post, user) => {
        if (post.status === "published") return true;
        return post.author.toString() === user._id.toString();
      },
    },
  },
  users: {
    Delete: {
      user: (targetUser, user) => {
        // User can only delete their own account
        return targetUser._id.toString() === user._id.toString();
      },
    },
    Deactivate: {
      user: (targetUser, user) => {
        // User can only deactivate their own account
        return targetUser._id.toString() === user._id.toString();
      },
    },
  },
};

// Moderation permissions - special logic for admin actions
const moderationPermissions = {
  posts: {
    Update: {
      admin: (post, user) => {
        return true;
      },
    },
    Delete: {
      admin: (post, user) => {
        const authorId = post.author._id || post.author;
        if (authorId.toString() === user._id.toString()) {
          return true;
        }
        if (post.author.role) {
          return post.author.role === "user";
        }
        return false;
      },
    },
  },
  interactions: {
    Update: {
      admin: (interaction, user) => {
        return true;
      },
    },
    Delete: {
      admin: (interaction, user) => {
        return true;
      },
    },
  },
  comments: {
    Update: {
      admin: (comment, user) => {
        return true;
      },
    },
    Delete: {
      user: (comment, user) => {
        const commentUserId = comment.user._id || comment.user;
        if (commentUserId.toString() === user._id.toString()) {
          return true;
        }
        if (comment.post && comment.post.author) {
          const postAuthorId = comment.post.author._id || comment.post.author;
          return postAuthorId.toString() === user._id.toString();
        }
        return false;
      },
      admin: (comment, user) => {
        const commentUserId = comment.user._id || comment.user;
        if (commentUserId.toString() === user._id.toString()) {
          return true;
        }
        if (comment.post && comment.post.author) {
          const postAuthorId = comment.post.author._id || comment.post.author;
          return postAuthorId.toString() === user._id.toString();
        }
        return false;
      },
    },
  },
  likes: {
    Delete: {
      admin: (like, user) => {
        return true;
      },
    },
  },
  users: {
    Update: {
      admin: (targetUser, user) => {
        return !["admin", "superadmin"].includes(targetUser.role);
      },
    },
    Delete: {
      admin: (targetUser, user) => {
        // Admin can delete their own account
        if (targetUser._id.toString() === user._id.toString()) {
          return true;
        }
        // Admin can delete regular users, but not other admins/superadmins
        return targetUser.role === "user";
      },
    },
    Deactivate: {
      admin: (targetUser, user) => {
        // Admin can deactivate their own account
        if (targetUser._id.toString() === user._id.toString()) {
          return true;
        }
        // Admin can deactivate regular users, but not other admins/superadmins
        return targetUser.role === "user";
      },
    },
  },
};

module.exports = {
  rolePermissions,
  conditionalPermissions,
  moderationPermissions,
};
