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
    posts: ["Create", "Read", "Update", "Delete"],
    reposts: ["Create", "Read", "Update", "Delete"],
    interactions: ["Create", "Read", "Update", "Delete"],
    likes: ["Create", "Read", "Update", "Delete"],
    comments: ["Create", "Read", "Update", "Delete"],
    users: ["Create", "Read", "Update", "Delete"],
  },
  admin: {
    posts: ["Create", "Read", "Update", "Delete"],
    reposts: ["Create", "Read", "Update", "Delete"],
    interactions: ["Create", "Read", "Update", "Delete"],
    likes: ["Create", "Read", "Update", "Delete"],
    comments: ["Create", "Read", "Update", "Delete"],
    users: ["Read", "Update"],
  },
  user: {
    posts: ["Create", "Read", "Update", "Delete"], // Own posts only
    reposts: ["Create", "Read", "Update", "Delete"], // Own reposts only
    interactions: ["Create", "Read", "Update", "Delete"], // Own interactions only
    likes: ["Create", "Read", "Delete"], // Own likes only
    comments: ["Create", "Read", "Update", "Delete"], // Own comments only
    users: ["Read"], // Own profile only
  },
  unknown: {
    posts: ["Read"],
    reposts: ["Read"],
    interactions: ["Read"],
    likes: ["Read"],
    comments: ["Read"],
    users: [],
  },
};

module.exports = { permissions, rolePermissions };
