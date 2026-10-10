"use strict";

const mongoose = require("mongoose");

/**
 * AuditLog — append-only record of status-changing actions.
 *
 * `resourceId` is polymorphic: it may refer to a Startup, Opportunity,
 * or InvestorInquiry depending on the value of `resourceType`.
 * The service layer is responsible for populating the correct document.
 *
 * No `updatedAt` timestamp: records are immutable once written.
 * No `actorRole` or `metadata`: keep the schema minimal per MVP scope.
 */

const ACTIONS = {
  STARTUP_CREATED: "startup.created",
  STARTUP_UPDATED: "startup.updated",
  OPPORTUNITY_SUBMITTED: "opportunity.submitted",
  OPPORTUNITY_RESUBMITTED: "opportunity.resubmitted",
  OPPORTUNITY_APPROVED: "opportunity.approved",
  OPPORTUNITY_CHANGES_REQUESTED: "opportunity.changes_requested",
  OPPORTUNITY_REJECTED: "opportunity.rejected",
  INQUIRY_CREATED: "inquiry.created",
  INQUIRY_STATUS_CHANGED: "inquiry.status_changed",
};

const ACTION_VALUES = Object.values(ACTIONS);

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Actor is required"],
    },

    action: {
      type: String,
      required: [true, "Action is required"],
      enum: {
        values: ACTION_VALUES,
        message: `Action must be one of: ${ACTION_VALUES.join(", ")}`,
      },
    },

    resourceType: {
      type: String,
      enum: {
        values: ["Startup", "Opportunity", "InvestorInquiry"],
        message: "resourceType must be Startup, Opportunity, or InvestorInquiry",
      },
      required: [true, "Resource type is required"],
    },

    // Polymorphic reference — the collection is identified by resourceType
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Resource ID is required"],
    },

    previousStatus: {
      type: String,
    },

    newStatus: {
      type: String,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: [1000, "Reason must be 1000 characters or fewer"],
    },
  },
  {
    // Only createdAt; updatedAt is intentionally omitted (records are immutable)
    timestamps: { createdAt: true, updatedAt: false },
    collection: "audit_logs",
  }
);

// Expose action constants for use in the service layer
auditLogSchema.statics.ACTIONS = ACTIONS;

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
