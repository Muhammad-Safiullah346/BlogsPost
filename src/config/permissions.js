const permissions = {
  posts: {
    permissions: ["Create", "Read", "Update", "Delete"],
    types: {
      reposts: ["Create", "Read", "Update", "Delete"],
      interactions: {
        permissions: ["Create", "Read", "Update", "Delete"],
        types: {
          likes: ["Create", "Read", "Update", "Delete"],
          comments: ["Create", "Read", "Update", "Delete"],
          reposts: ["Create", "Read", "Update", "Delete"],
        },
      },
    },
  },
};

const rolePermissions = {
  superadmin: {
    posts: {
      Create: "any",
      Read: "any",
      Update: "any",
      Delete: "any",
    },
    reposts: {
      Create: "any",
      Read: "any",
      Update: "any",
      Delete: "any",
    },
    interactions: {
      Create: "any",
      Read: "any",
      Update: "any",
      Delete: "any",
    },
    likes: {
      Create: "any",
      Read: "any",
      Update: "any",
      Delete: "any",
    },
    comments: {
      Create: "any",
      Read: "any",
      Update: "any",
      Delete: "any",
    },
    users: {
      Create: "any",
      Read: "any",
      Update: "any",
      Delete: "any",
    },
  },
  admin: {
    posts: {
      Create: "any",
      Read: "any",
      Update: "any",
      Delete: "any",
    },
    reposts: {
      Create: "any",
      Read: "any",
      Update: "any",
      Delete: "any",
    },
    interactions: {
      Create: "any",
      Read: "any",
      Update: "any",
      Delete: "any",
    },
    likes: {
      Create: "any",
      Read: "any",
      Update: "any",
      Delete: "any",
    },
    comments: {
      Create: "any",
      Read: "any",
      Update: "any",
      Delete: "any",
    },
    users: {
      Read: "any",
      Update: "any",
    },
  },
  user: {
    posts: {
      Create: "own",
      Read: "conditional", // Published: any, Draft/Archived: own
      Update: "own",
      Delete: "own",
    },
    reposts: {
      Create: "own",
      Read: "conditional", // Only published posts can be reposted
      Update: "own",
      Delete: "own",
    },
    interactions: {
      Create: "conditional", // Only on published posts
      Read: "conditional", // Can read all interactions on published posts, own interactions on archived posts
      Update: "own",
      Delete: "own",
    },
    likes: {
      Create: "conditional", // Only on published posts
      Read: "conditional", // Can read all likes on published posts, own likes on archived posts
      Delete: "own",
    },
    comments: {
      Create: "conditional", // Only on published posts
      Read: "conditional", // Can read all comments on published posts, own comments on archived posts
      Update: "own",
      Delete: "own",
    },
    users: {
      Read: "own", // Own profile only
      Update: "own",
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
    users: {},
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
        // UPDATED: Users can only interact with published posts (not even their own drafts)
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
        // UPDATED: Users can only like published posts (not even their own drafts)
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
        // UPDATED: Users can only comment on published posts (not even their own drafts)
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

module.exports = { permissions, rolePermissions, conditionalPermissions };
