const rolePermissions = {
  superadmin: {
    posts: {
      Create: "own", // Superadmin can create their own posts
      Read: "any", // Can read all posts for moderation
      Update: "any", // Can moderate/edit any post
      Delete: "any", // Can delete any post for moderation
    },
    reposts: {
      Create: "own", // Can create their own reposts
      Read: "any", // Can read all reposts
      Update: "any", // Can moderate reposts
      Delete: "any", // Can delete any repost
    },
    interactions: {
      Create: "own", // Can create their own interactions
      Read: "any", // Can read all interactions for moderation
      Update: "any", // Can moderate interactions
      Delete: "any", // Can delete any interaction
    },
    likes: {
      Create: "own", // Can like posts themselves
      Read: "any", // Can see all likes
      Update: "own", // Can only update their own likes
      Delete: "any", // Can delete any like for moderation
    },
    comments: {
      Create: "own", // Can comment themselves
      Read: "any", // Can read all comments
      Update: "any", // Can moderate comments
      Delete: "any", // Can delete any comment
    },
    users: {
      Create: "any", // Can create user accounts
      Read: "any", // Can view all users
      Update: "any", // Can modify user accounts
      Delete: "any", // Can delete/deactivate users
    },
  },
  admin: {
    posts: {
      Create: "own", // Admin can create their own posts
      Read: "any", // Can read all posts for moderation
      Update: "moderate", // Can moderate posts (special permission)
      Delete: "moderate", // Can delete posts for moderation
    },
    reposts: {
      Create: "own", // Can create their own reposts
      Read: "any", // Can read all reposts
      Update: "moderate", // Can moderate reposts
      Delete: "moderate", // Can delete reposts
    },
    interactions: {
      Create: "own", // Can create their own interactions
      Read: "any", // Can read all interactions
      Update: "moderate", // Can moderate interactions
      Delete: "moderate", // Can delete interactions
    },
    likes: {
      Create: "own", // Can like posts themselves
      Read: "any", // Can see all likes
      Update: "own", // Can only update their own likes
      Delete: "moderate", // Can delete likes for moderation
    },
    comments: {
      Create: "own", // Can comment themselves
      Read: "any", // Can read all comments
      Update: "moderate", // Can moderate comments
      Delete: "moderate", // Can delete comments
    },
    users: {
      Read: "any", // Can view all users
      Update: "moderate", // Can moderate users (limited)
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
      Update: "own", // Can update their own likes
      Delete: "own", // Can only delete their own likes
    },
    comments: {
      Create: "conditional", // Only on published posts
      Read: "conditional", // Can read all comments on published posts, own comments on archived posts
      Update: "own", // Can only update their own comments
      Delete: "own", // Can only delete their own comments
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
        // Admin can delete any post for moderation
        return true;
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
      admin: (comment, user) => {
        // Admin can delete comments
        return true;
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
