"use strict";

const mongoose = require("mongoose");

/**
 * Valid status transitions for an InvestorInquiry.
 * Closed statuses (closed_won, closed_lost) are terminal — no outgoing edges.
 *
 * new            → contacted | closed_lost
 * contacted      → meeting_scheduled | closed_lost
 * meeting_scheduled → due_diligence | closed_lost
 * due_diligence  → closed_won | closed_lost
 *
 * Transition enforcement belongs in the service layer, which must also:
 *  - Derive `startup` from the referenced opportunity (never trust client input).
 *  - Verify the actor holds the `investor` role.
 *  - Verify the referenced opportunity has status `approved`.
 *  - Prevent duplicate inquiries (enforced by the compound unique index below).
 */
const ALLOWED_TRANSITIONS = {
  new: ["contacted", "closed_lost"],
  contacted: ["meeting_scheduled", "closed_lost"],
  meeting_scheduled: ["due_diligence", "closed_lost"],
  due_diligence: ["closed_won", "closed_lost"],
  closed_won: [],
  closed_lost: [],
};

const STATUS_VALUES = Object.keys(ALLOWED_TRANSITIONS);

const investorInquirySchema = new mongoose.Schema(
  {
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
      required: [true, "Opportunity reference is required"],
    },

    // Denormalised from the opportunity by the service layer
    startup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: [true, "Startup reference is required"],
    },

    investor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Investor reference is required"],
    },

    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [1000, "Message must be 1000 characters or fewer"],
    },

    status: {
      type: String,
      enum: {
        values: STATUS_VALUES,
        message: `Status must be one of: ${STATUS_VALUES.join(", ")}`,
      },
      default: "new",
      required: true,
    },

    nextStep: {
      type: String,
      trim: true,
      maxlength: [500, "Next step must be 500 characters or fewer"],
    },

    statusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    statusUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "investor_inquiries",
  }
);

// Index: prevent duplicate inquiries from the same investor on the same opportunity
investorInquirySchema.index(
  { investor: 1, opportunity: 1 },
  { unique: true }
);

// Index: founder pipeline lists inquiries by startup, newest first
investorInquirySchema.index({ startup: 1, createdAt: -1 });

// Expose the allowed-transitions map for use in the service layer
investorInquirySchema.statics.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;

const InvestorInquiry = mongoose.model(
  "InvestorInquiry",
  investorInquirySchema
);

module.exports = InvestorInquiry;
