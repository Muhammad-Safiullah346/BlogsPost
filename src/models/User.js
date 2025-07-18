const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profile: {
      firstName: String,
      lastName: String,
      bio: String,
      avatar: String,
    },
    lastDeactivated: {
      type: Date,
    },
    deactivationCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Track deactivation
userSchema.methods.deactivate = function () {
  this.isActive = false;
  this.lastDeactivated = new Date();
  this.deactivationCount += 1;
  return this.save();
};

// Track reactivation
userSchema.methods.reactivate = function () {
  this.isActive = true;
  return this.save();
};

module.exports = mongoose.model("User", userSchema);
