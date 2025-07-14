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
      Read: "any",
      Update: "own",
      Delete: "own",
    },
    interactions: {
      Create: "own",
      Read: "any",
      Update: "own",
      Delete: "own",
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
      Read: "any",
    },
    likes: {
      Read: "any",
    },
    comments: {
      Read: "any",
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
};

module.exports = { permissions, rolePermissions, conditionalPermissions };
