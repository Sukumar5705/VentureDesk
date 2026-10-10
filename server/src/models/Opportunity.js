"use strict";

const mongoose = require("mongoose");

const STAGE_VALUES = [
  "pre_seed",
  "seed",
  "series_a",
  "series_b",
  "series_c_plus",
  "other",
];

const STATUS_VALUES = [
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
  "rejected",
];

// Review-required statuses: a non-empty reviewNote is mandatory
const REVIEW_NOTE_REQUIRED_STATUSES = ["changes_requested", "rejected"];

/**
 * Embedded snapshot of key startup fields, captured by the service layer
 * at submission time. Never trust client-provided snapshot data.
 */
const startupSnapshotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Snapshot name must be 100 characters or fewer"],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, "Snapshot description must be 2000 characters or fewer"],
    },
    industry: { type: String, required: true },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Snapshot location must be 100 characters or fewer"],
    },
    website: {
      type: String,
      trim: true,
      maxlength: [300, "Snapshot website must be 300 characters or fewer"],
    },
  },
  { _id: false }
);

const opportunitySchema = new mongoose.Schema(
  {
    startup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: [true, "Startup reference is required"],
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [150, "Title must be 150 characters or fewer"],
    },

    stage: {
      type: String,
      enum: {
        values: STAGE_VALUES,
        message: `Stage must be one of: ${STAGE_VALUES.join(", ")}`,
      },
    },

    // Amount in INR; must be a positive integer when provided
    fundingRequired: {
      type: Number,
      min: [1, "Funding required must be a positive integer"],
max: [100000000000, "Funding required is too large"], 
      validate: {
        validator(value) {
          if (value == null) return true; // optional
          return Number.isInteger(value);
        },
        message: "Funding required must be a whole number (INR)",
      },
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description must be 2000 characters or fewer"],
    },

    useOfFunds: {
      type: String,
      trim: true,
      maxlength: [2000, "Use of funds must be 2000 characters or fewer"],
    },

    status: {
      type: String,
      enum: {
        values: STATUS_VALUES,
        message: `Status must be one of: ${STATUS_VALUES.join(", ")}`,
      },
      default: "draft",
      required: [true, "Status is required"],
    },

    /**
     * Snapshot embedded at submission time by the service layer.
     * Do not populate this from client input.
     */
    startupSnapshot: {
      type: startupSnapshotSchema,
    },

    submittedAt: {
      type: Date,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: {
      type: Date,
    },

    /**
     * Required (non-empty) when status is 'changes_requested' or 'rejected'.
     * Enforced via the pre('validate') hook below, which has access to the
     * full document context (path-level validators only receive the field value).
     * NOTE: pre('validate') does NOT run on findOneAndUpdate — the review
     * service's Zod schema must also require reviewNote for those statuses.
     */
    reviewNote: {
      type: String,
      trim: true,
      maxlength: [1000, "Review note must be 1000 characters or fewer"],
    },

    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "opportunities",
  }
);

// Document-level validation: reviewNote must be non-empty when the reviewer
// requests changes or rejects the opportunity.
// pre('validate') is used so `this` refers to the full document.
opportunitySchema.pre("validate", function checkReviewNote() {
  if (
    REVIEW_NOTE_REQUIRED_STATUSES.includes(this.status) &&
    (!this.reviewNote || this.reviewNote.trim().length === 0)
  ) {
    this.invalidate(
      "reviewNote",
      `reviewNote is required when status is '${this.status}'`,
      this.reviewNote
    );
  }
});

// Indexes
opportunitySchema.index({ status: 1, publishedAt: -1 });
opportunitySchema.index({ status: 1, submittedAt: -1 });

const Opportunity = mongoose.model("Opportunity", opportunitySchema);

module.exports = Opportunity;
