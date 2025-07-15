const rolePermissions = {
  superadmin: {
    posts: {
      Read: "any", // Can read all posts for moderation
      Delete: "any", // Can delete any post for moderation
    },
    reposts: {
      Read: "any", // Can read all reposts
      Delete: "any", // Can delete any repost
    },
    interactions: {
      Read: "any", // Can read all interactions for moderation
      Delete: "any", // Can delete any interaction
    },
    likes: {
      Read: "any", // Can see all likes
      Delete: "any", // Can delete any like for moderation
    },
    comments: {
      Read: "any", // Can read all comments
      Delete: "any", // Can delete any comment
    },
    users: {
      Create: "any", // Can create user accounts
      Read: "any", // Can view all users
      Delete: "any", // Can delete/deactivate users
    },
  },
  admin: {
    posts: {
      Create: "own", // Admin can create their own posts
      Read: "any", // Can read all posts for moderation
      Update: "own", // Can moderate posts (special permission)
      Delete: "moderate", // Can delete posts for moderation
    },
    reposts: {
      Create: "own", // Can create their own reposts
      Read: "any", // Can read all reposts
      Update: "own", // Can moderate reposts
      Delete: "moderate", // Can delete reposts
    },
    interactions: {
      Create: "own", // Can create their own interactions
      Read: "any", // Can read all interactions
      Update: "own", // Can moderate interactions
      Delete: "moderate", // Can delete interactions
    },
    likes: {
      Create: "own", // Can like posts themselves
      Read: "any", // Can see all likes
      Delete: "own", // Can delete likes for moderation
    },
    comments: {
      Create: "own", // Can comment themselves
      Read: "any", // Can read all comments
      Update: "own", // Can moderate comments
      Delete: "own", // Can delete comments
    },
    users: {
      Read: "any", // Can view all users
      update: "own", // Can update their own profile
      Delete: "moderate", // Can deactivate users
    },
  },
  user: {
    posts: {
      Create: "own", // Users create their own posts
      Read: "conditional", // Published: any, Draft/Archived: own
      Update: "own", // Can only update their own posts
      Delete: "own", // Can only delete their own posts
    },
    reposts: {
      Create: "own", // Can create their own reposts
      Read: "conditional", // Only published posts can be reposted
      Update: "own", // Can only update their own reposts
      Delete: "own", // Can only delete their own reposts
    },
    interactions: {
      Create: "conditional", // Only on published posts
      Read: "conditional", // Can read all interactions on published posts, own interactions on archived posts
      Update: "own", // Can only update their own interactions
      Delete: "own", // Can only delete their own interactions
    },
    likes: {
      Create: "conditional", // Only on published posts
      Read: "conditional", // Can read all likes on published posts, own likes on archived posts
      Delete: "own", // Can only delete their own likes
    },
    comments: {
      Create: "conditional", // Only on published posts
      Read: "conditional", // Can read all comments on published posts, own comments on archived posts
      Update: "own", // Can only update their own comments
      Delete: "moderate", // Can delete their own comments + comments on their posts
    },
    users: {
      Read: "own", // Own profile only
      Update: "own", // Can only update their own profile
    },
  },
  unknown: {
    posts: {
      Read: "published_only", // Only published posts
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
        // Users can read all published posts
        if (post.status === "published") return true;
        // Users can only read their own draft/archived posts
        return post.author.toString() === user._id.toString();
      },
    },
  },
  reposts: {
    Create: {
      user: (post, user) => {
        // Users can only repost published posts
        return post.status === "published";
      },
    },
    Read: {
      user: (post, user) => {
        // Users can read all published posts or their own archived posts
        if (post.status === "published") return true;
        return post.author.toString() === user._id.toString();
      },
    },
  },
  interactions: {
    Create: {
      user: (post, user) => {
        // Users can only interact with published posts
        return post.status === "published";
      },
    },
    Read: {
      user: (post, user) => {
        // Users can read all interactions on published posts
        if (post.status === "published") return true;
        // Users can read all interactions on their own archived posts
        return post.author.toString() === user._id.toString();
      },
    },
  },
  likes: {
    Create: {
      user: (post, user) => {
        // Users can only like published posts
        return post.status === "published";
      },
    },
    Read: {
      user: (post, user) => {
        // Users can read all likes on published posts
        if (post.status === "published") return true;
        // Users can read all likes on their own archived posts
        return post.author.toString() === user._id.toString();
      },
    },
  },
  comments: {
    Create: {
      user: (post, user) => {
        // Users can only comment on published posts
        return post.status === "published";
      },
    },
    Read: {
      user: (post, user) => {
        // Users can read all comments on published posts
        if (post.status === "published") return true;
        // Users can read all comments on their own archived posts
        return post.author.toString() === user._id.toString();
      },
    },
  },
};

// Moderation permissions - special logic for admin actions
const moderationPermissions = {
  posts: {
    Update: {
      admin: (post, user) => {
        // Admin can moderate any post, but typically for policy violations
        return true;
      },
    },
    Delete: {
      admin: (post, user) => {
        // Admin can delete their own posts and regular users' posts
        // But not other admins' or superadmins' posts

        // Check if it's their own post
        const authorId = post.author._id || post.author;
        if (authorId.toString() === user._id.toString()) {
          return true; // Can delete own posts
        }

        // Check author role if populated
        if (post.author.role) {
          return post.author.role === "user"; // Can only delete regular users' posts
        }

        // If author role not populated, deny access for safety
        return false;
      },
    },
  },
  interactions: {
    Update: {
      admin: (interaction, user) => {
        // Admin can moderate any interaction
        return true;
      },
    },
    Delete: {
      admin: (interaction, user) => {
        // Admin can delete any interaction
        return true;
      },
    },
  },
  comments: {
    Update: {
      admin: (comment, user) => {
        // Admin can moderate comments
        return true;
      },
    },
    Delete: {
      user: (comment, user) => {
        // User can delete their own comments OR comments on their own posts

        // Check if it's their own comment
        const commentUserId = comment.user._id || comment.user;
        if (commentUserId.toString() === user._id.toString()) {
          return true; // Can delete own comments
        }

        // Check if it's a comment on their own post
        if (comment.post && comment.post.author) {
          const postAuthorId = comment.post.author._id || comment.post.author;
          return postAuthorId.toString() === user._id.toString();
        }

        return false;
      },
      admin: (comment, user) => {
        // Admin can delete their own comments OR comments on their own posts
        // (same logic as users - admins don't get special comment moderation privileges)

        // Check if it's their own comment
        const commentUserId = comment.user._id || comment.user;
        if (commentUserId.toString() === user._id.toString()) {
          return true; // Can delete own comments
        }

        // Check if it's a comment on their own post
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
        // Admin can delete likes (rare, but for spam control)
        return true;
      },
    },
  },
  users: {
    Update: {
      admin: (targetUser, user) => {
        // Admin can moderate users but not other admins/superadmins
        return !["admin", "superadmin"].includes(targetUser.role);
      },
    },
    Delete: {
      admin: (targetUser, user) => {
        // Admin can deactivate regular users
        return targetUser.role === "user";
      },
    },
  },
};

module.exports = {
  permissions,
  rolePermissions,
  conditionalPermissions,
  moderationPermissions,
};
