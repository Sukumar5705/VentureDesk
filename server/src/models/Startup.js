"use strict";

const mongoose = require("mongoose");

const INDUSTRY_VALUES = [
  "ai_ml",
  "agritech",
  "climate_energy",
  "cybersecurity",
  "ecommerce",
  "edtech",
  "fintech",
  "healthtech",
  "logistics",
  "real_estate",
  "saas",
  "consumer",
  "other",
];

const startupSchema = new mongoose.Schema(
  {
    // One startup per founder — enforced by unique index on owner below
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
      // unique removed from field level — enforced by schema.index below
    },

    name: {
      type: String,
      required: [true, "Startup name is required"],
      trim: true,
      maxlength: [100, "Name must be 100 characters or fewer"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [2000, "Description must be 2000 characters or fewer"],
    },

    industry: {
      type: String,
      required: [true, "Industry is required"],
      enum: {
        values: INDUSTRY_VALUES,
        message: `Industry must be one of: ${INDUSTRY_VALUES.join(", ")}`,
      },
    },

    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxlength: [100, "Location must be 100 characters or fewer"],
    },

    website: {
      type: String,
      trim: true,
      maxlength: [300, "Website must be 300 characters or fewer"],
      validate: {
        validator(value) {
          if (!value) return true; // optional field
          try {
            const url = new URL(value);
            return url.protocol === "http:" || url.protocol === "https:";
          } catch {
            return false;
          }
        },
        message: "Website must be a valid http or https URL",
      },
    },
  },
  {
    timestamps: true,
    collection: "startups",
  }
);

// Index: one startup per founder
startupSchema.index({ owner: 1 }, { unique: true });

// Expose industry constants so validators can import from this single source
startupSchema.statics.INDUSTRY_VALUES = INDUSTRY_VALUES;

const Startup = mongoose.model("Startup", startupSchema);

// Named export so validators can import without going through the model:
//   const { INDUSTRY_VALUES } = require("../models/Startup");
Startup.INDUSTRY_VALUES = INDUSTRY_VALUES;

module.exports = Startup;
