"use strict";

const mongoose = require("mongoose");
const Opportunity = require("../models/Opportunity");
const Startup = require("../models/Startup");
const AuditLog = require("../models/AuditLog");
const {
  createOpportunitySchema,
  updateOpportunitySchema,
  reviewOpportunitySchema,
  adminListQuerySchema,
  publicListQuerySchema,
} = require("../../../server/src/validators/opportunityValidators");
const { formatZodError } = require("../validators/authValidators");

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Public shape returned to the founder for their own opportunities. */
function publicOpportunity(doc) {
  return {
    id: doc._id.toString(),
    startup: doc.startup.toString(),
    title: doc.title,
    stage: doc.stage ?? null,
    fundingRequired: doc.fundingRequired ?? null,
    description: doc.description ?? null,
    useOfFunds: doc.useOfFunds ?? null,
    status: doc.status,
    startupSnapshot: doc.startupSnapshot ?? null,
    submittedAt: doc.submittedAt ?? null,
    reviewNote: doc.reviewNote ?? null,
    publishedAt: doc.publishedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Public shape returned to the admin (includes reviewer fields). */
function adminOpportunity(doc) {
  return {
    ...publicOpportunity(doc),
    reviewedBy: doc.reviewedBy ? doc.reviewedBy.toString() : null,
    reviewedAt: doc.reviewedAt ?? null,
  };
}

/**
 * Public shape for investor discovery. Built field-by-field from the reviewed
 * startupSnapshot only — never the live Startup, startup/owner ids, reviewNote
 * or reviewer fields.
 */
function discoveryOpportunity(doc) {
  const snap = doc.startupSnapshot ?? {};
  return {
    id: doc._id.toString(),
    title: doc.title,
    stage: doc.stage,
    fundingRequired: doc.fundingRequired, // INR
    description: doc.description,
    useOfFunds: doc.useOfFunds,
    publishedAt: doc.publishedAt ?? null,
    startup: {
      name: snap.name,
      description: snap.description,
      industry: snap.industry,
      location: snap.location,
      website: snap.website ?? null,
    },
  };
}

/** Escape user text so it is matched literally inside a RegExp. */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Validate a MongoDB ObjectId string; return false if malformed. */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/** Map a Mongoose ValidationError to the project's 400 shape. */
function handleMongooseValidation(err, res) {
  const details = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return res.status(400).json({
    error: { code: "VALIDATION_ERROR", message: "Validation failed", details },
  });
}

// ── GET /api/opportunities (public) ───────────────────────────────────────────

async function listPublicOpportunities(req, res, next) {
  try {
    const parsed = publicListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { page, limit, search, industry, stage, location, minFunding, maxFunding, sortBy, order } =
      parsed.data;

    // status is hard-coded: no client input can widen it beyond approved.
    const filter = { status: "approved" };
    if (industry) filter["startupSnapshot.industry"] = industry;
    if (stage) filter.stage = stage;
    if (location) filter["startupSnapshot.location"] = { $regex: escapeRegex(location), $options: "i" };
    if (minFunding !== undefined || maxFunding !== undefined) {
      filter.fundingRequired = {
        ...(minFunding !== undefined && { $gte: minFunding }),
        ...(maxFunding !== undefined && { $lte: maxFunding }),
      };
    }
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ title: rx }, { description: rx }, { "startupSnapshot.name": rx }];
    }

    const dir = order === "asc" ? 1 : -1;
    const sort = { [sortBy]: dir, _id: dir }; // _id = stable tiebreaker for paging
    const skip = (page - 1) * limit;

    const [opportunities, total] = await Promise.all([
      Opportunity.find(filter)
        .select("title stage fundingRequired description useOfFunds publishedAt startupSnapshot")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Opportunity.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: opportunities.map(discoveryOpportunity),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return next(err);
  }
}

// ── POST /api/opportunities ────────────────────────────────────────────────────

async function createOpportunity(req, res, next) {
  try {
    const parsed = createOpportunitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    // Resolve the founder's startup — never accept startup from client
    const startup = await Startup.findOne({ owner: req.user.id }).lean();
    if (!startup) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "You must create a startup profile before adding opportunities",
        },
      });
    }

    const { title, stage, fundingRequired, description, useOfFunds } = parsed.data;

    let opportunity;
    try {
      opportunity = await Opportunity.create({
        startup: startup._id,
        title,
        ...(stage !== undefined && { stage }),
        ...(fundingRequired !== undefined && { fundingRequired }),
        ...(description !== undefined && { description }),
        ...(useOfFunds !== undefined && { useOfFunds }),
        // status defaults to "draft" in the schema
      });
    } catch (err) {
      if (err.name === "ValidationError") return handleMongooseValidation(err, res);
      throw err;
    }

    return res.status(201).json({ data: publicOpportunity(opportunity) });
  } catch (err) {
    return next(err);
  }
}

// ── GET /api/opportunities/mine ────────────────────────────────────────────────

async function listMyOpportunities(req, res, next) {
  try {
    const startup = await Startup.findOne({ owner: req.user.id }).lean();
    if (!startup) {
      // No startup yet — return empty list rather than an error
      return res.status(200).json({ data: [] });
    }

    const opportunities = await Opportunity.find({ startup: startup._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ data: opportunities.map(publicOpportunity) });
  } catch (err) {
    return next(err);
  }
}

// ── PATCH /api/opportunities/:id ──────────────────────────────────────────────

async function updateOpportunity(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Invalid opportunity ID" },
      });
    }

    const parsed = updateOpportunitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const startup = await Startup.findOne({ owner: req.user.id }).lean();
    if (!startup) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Startup profile not found" },
      });
    }

    // Load the opportunity, verifying it belongs to this founder's startup
    const existing = await Opportunity.findOne({
      _id: id,
      startup: startup._id,
    }).lean();

    if (!existing) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Opportunity not found" },
      });
    }

    // Only draft and changes_requested are editable
    if (!["draft", "changes_requested"].includes(existing.status)) {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: `Opportunities with status '${existing.status}' cannot be edited`,
        },
      });
    }

    let updated;
    try {
      updated = await Opportunity.findOneAndUpdate(
        {
          _id: id,
          startup: startup._id,
          // Atomic: only update if status hasn't changed underneath us
          status: existing.status,
        },
        { $set: parsed.data },
        { new: true, runValidators: true }
      );
    } catch (err) {
      if (err.name === "ValidationError") return handleMongooseValidation(err, res);
      throw err;
    }

    if (!updated) {
      // Status changed between our read and write — concurrent modification
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "Opportunity was modified by another request; please retry",
        },
      });
    }

    return res.status(200).json({ data: publicOpportunity(updated) });
  } catch (err) {
    return next(err);
  }
}

// ── POST /api/opportunities/:id/submit ────────────────────────────────────────

async function submitOpportunity(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Invalid opportunity ID" },
      });
    }

    const startup = await Startup.findOne({ owner: req.user.id }).lean();
    if (!startup) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Startup profile not found" },
      });
    }

    const existing = await Opportunity.findOne({
      _id: id,
      startup: startup._id,
    }).lean();

    if (!existing) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Opportunity not found" },
      });
    }

    // Only draft and changes_requested can be submitted
    if (!["draft", "changes_requested"].includes(existing.status)) {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: `Cannot submit an opportunity with status '${existing.status}'`,
        },
      });
    }

    // Completeness check — all funding fields must be present
    const missing = [];
    if (!existing.stage) missing.push("stage");
    if (!existing.fundingRequired) missing.push("fundingRequired");
    if (!existing.description) missing.push("description");
    if (!existing.useOfFunds) missing.push("useOfFunds");

    if (missing.length > 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Opportunity is incomplete and cannot be submitted",
          details: missing.map((f) => ({ field: f, message: `${f} is required for submission` })),
        },
      });
    }

    // Build snapshot from the live Startup document — never from client data
    const startupSnapshot = {
      name: startup.name,
      description: startup.description,
      industry: startup.industry,
      location: startup.location,
      ...(startup.website && { website: startup.website }),
    };

    const previousStatus = existing.status;
    const isResubmission = previousStatus === "changes_requested";

    // Atomic status transition — fails if status changed concurrently
    let submitted;
    try {
      submitted = await Opportunity.findOneAndUpdate(
        {
          _id: id,
          startup: startup._id,
          status: previousStatus, // guard against concurrent change
        },
        {
          $set: {
            status: "pending_review",
            startupSnapshot,
            submittedAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      );
    } catch (err) {
      if (err.name === "ValidationError") return handleMongooseValidation(err, res);
      throw err;
    }

    if (!submitted) {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "Opportunity was modified by another request; please retry",
        },
      });
    }

    // Append-only audit record — awaited so the log write completes before the
    // response is sent. Failures are logged to stderr but do not fail the request.
    try {
      await AuditLog.create({
        actor: req.user.id,
        action: isResubmission
          ? AuditLog.ACTIONS.OPPORTUNITY_RESUBMITTED
          : AuditLog.ACTIONS.OPPORTUNITY_SUBMITTED,
        resourceType: "Opportunity",
        resourceId: submitted._id,
        previousStatus,
        newStatus: "pending_review",
      });
    } catch (auditErr) {
      console.error("[audit] failed to write submission log:", auditErr.message);
    }

    return res.status(200).json({ data: publicOpportunity(submitted) });
  } catch (err) {
    return next(err);
  }
}

// ── GET /api/admin/opportunities ──────────────────────────────────────────────

async function adminListOpportunities(req, res, next) {
  try {
    const parsed = adminListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { status, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const [opportunities, total] = await Promise.all([
      Opportunity.find({ status })
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Opportunity.countDocuments({ status }),
    ]);

    return res.status(200).json({
      data: opportunities.map(adminOpportunity),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return next(err);
  }
}

// ── GET /api/admin/opportunities/:id ──────────────────────────────────────────

async function adminGetOpportunity(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Invalid opportunity ID" },
      });
    }

    const opportunity = await Opportunity.findById(id).lean();
    if (!opportunity) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Opportunity not found" },
      });
    }

    // Admins should not be able to access founders' unpublished drafts;
    // they only manage submitted / reviewed listings.
    if (opportunity.status === "draft") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Opportunity not found" },
      });
    }

    return res.status(200).json({ data: adminOpportunity(opportunity) });
  } catch (err) {
    return next(err);
  }
}

// ── PATCH /api/admin/opportunities/:id/review ─────────────────────────────────

async function reviewOpportunity(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Invalid opportunity ID" },
      });
    }

    const parsed = reviewOpportunitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { decision, reviewNote } = parsed.data;

    // Load and verify the opportunity is in pending_review
    const existing = await Opportunity.findById(id).lean();
    if (!existing) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Opportunity not found" },
      });
    }

    if (existing.status !== "pending_review") {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: `Only pending_review opportunities can be reviewed; current status is '${existing.status}'`,
        },
      });
    }

    const now = new Date();
    const updateFields = {
      status: decision,
      reviewedBy: req.user.id,
      reviewedAt: now,
      ...(reviewNote !== undefined && { reviewNote }),
      ...(decision === "approved" && { publishedAt: now }),
    };

    // On approval with no new reviewNote, clear any stale note from a prior
    // "changes_requested" cycle so the approved listing shows no outdated feedback.
    const unsetFields =
      decision === "approved" && reviewNote === undefined
        ? { $unset: { reviewNote: 1 } }
        : {};

    // Atomic update — status guard prevents concurrent review races
    let reviewed;
    try {
      reviewed = await Opportunity.findOneAndUpdate(
        { _id: id, status: "pending_review" },
        { $set: updateFields, ...unsetFields },
        { new: true, runValidators: false } // runValidators skipped: reviewNote
        // hook only fires on full validate()
      );
    } catch (err) {
      if (err.name === "ValidationError") return handleMongooseValidation(err, res);
      throw err;
    }

    if (!reviewed) {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "Opportunity status changed before your review was applied; please retry",
        },
      });
    }

    // Map decision to AuditLog action
    const ACTION_MAP = {
      approved: AuditLog.ACTIONS.OPPORTUNITY_APPROVED,
      changes_requested: AuditLog.ACTIONS.OPPORTUNITY_CHANGES_REQUESTED,
      rejected: AuditLog.ACTIONS.OPPORTUNITY_REJECTED,
    };

    // Append-only audit record — awaited so the log write completes before the
    // response is sent. Failures are logged to stderr but do not fail the request.
    try {
      await AuditLog.create({
        actor: req.user.id,
        action: ACTION_MAP[decision],
        resourceType: "Opportunity",
        resourceId: reviewed._id,
        previousStatus: "pending_review",
        newStatus: decision,
        ...(reviewNote && { reason: reviewNote }),
      });
    } catch (auditErr) {
      console.error("[audit] failed to write review log:", auditErr.message);
    }

    return res.status(200).json({ data: adminOpportunity(reviewed) });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPublicOpportunities,
  createOpportunity,
  listMyOpportunities,
  updateOpportunity,
  submitOpportunity,
  adminListOpportunities,
  adminGetOpportunity,
  reviewOpportunity,
};
