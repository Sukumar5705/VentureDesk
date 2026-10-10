"use strict";

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Full name must be 100 characters or fewer"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      // unique removed from field level — enforced by schema.index below
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: ["founder", "investor", "admin"],
        message: "Role must be founder, investor, or admin",
      },
      required: [true, "Role is required"],
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Index: unique email
userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

module.exports = User;
