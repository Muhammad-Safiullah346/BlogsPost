const Joi = require("joi");

const validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().max(50).optional(),
    lastName: Joi.string().max(50).optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const validateAccountDeletion = (req, res, next) => {
  const schema = Joi.object({
    password: Joi.string().required(),
    confirmDelete: Joi.string().valid("DELETE_MY_ACCOUNT").required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const validatePost = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().max(200).required(),
    content: Joi.string().required(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    featuredImage: Joi.string().uri().optional(),
    excerpt: Joi.string().max(300).optional(),
    status: Joi.string().valid("draft", "published", "archived").optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const validatePostUpdate = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().max(200).optional(),
    content: Joi.string().optional(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    featuredImage: Joi.string().uri().optional(),
    excerpt: Joi.string().max(300).optional(),
    status: Joi.string().valid("draft", "published", "archived").optional(),
  }).min(1); // At least one field must be provided

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const validateInteraction = (req, res, next) => {
  const schema = Joi.object({
    type: Joi.string().valid("like", "comment").required(),
    content: Joi.when("type", {
      is: "comment",
      then: Joi.string().required().min(1).max(1000),
      otherwise: Joi.forbidden(), // For likes
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const validateRepost = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().max(200).optional(),
    comment: Joi.string().max(500).optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateAccountDeletion,
  validatePost,
  validatePostUpdate,
  validateInteraction,
  validateRepost,
};
