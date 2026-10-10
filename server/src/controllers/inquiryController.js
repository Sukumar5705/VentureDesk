"use strict";

const Opportunity = require("../models/Opportunity");
const Startup = require("../models/Startup");
const InvestorInquiry = require("../models/InvestorInquiry");
const AuditLog = require("../models/AuditLog");
const {
  createInquirySchema,
  listMyInquiriesQuerySchema,
  listStartupInquiriesQuerySchema,
  updateInquiryStatusSchema,
} = require("../validators/inquiryValidators");
const { formatZodError } = require("../validators/authValidators");

// ── Helpers ────────────────────────────────────────────────────────────────────

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const isValidObjectId = (id) => typeof id === "string" && OBJECT_ID_RE.test(id);

const badId = (res, what) =>
  res.status(400).json({ error: { code: "BAD_REQUEST", message: `Invalid ${what} ID` } });

const notFound = (res, message) =>
  res.status(404).json({ error: { code: "NOT_FOUND", message } });

function handleMongooseValidation(err, res) {
  const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  return res.status(400).json({
    error: { code: "VALIDATION_ERROR", message: "Validation failed", details },
  });
}

/** Base inquiry fields shared by every response. */
function baseInquiry(doc) {
  return {
    id: doc._id.toString(),
    message: doc.message,
    status: doc.status,
    nextStep: doc.nextStep ?? null,
    statusUpdatedAt: doc.statusUpdatedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Compact opportunity summary built from the reviewed snapshot only. */
function opportunitySummary(opp) {
  if (!opp || !opp._id) return null; // not populated / opportunity removed
  const snap = opp.startupSnapshot ?? {};
  return {
    id: opp._id.toString(),
    title: opp.title,
    stage: opp.stage,
    fundingRequired: opp.fundingRequired, // INR
    startup: { name: snap.name, industry: snap.industry, location: snap.location },
  };
}

/** Investor's own view. */
function investorInquiryDto(doc) {
  return { ...baseInquiry(doc), opportunity: opportunitySummary(doc.opportunity) };
}

/** Founder's view — investor display name only, never email. */
function founderInquiryDto(doc) {
  return {
    ...baseInquiry(doc),
    investor: doc.investor && doc.investor._id
      ? { id: doc.investor._id.toString(), fullName: doc.investor.fullName }
      : null,
    opportunity: doc.opportunity && doc.opportunity._id
      ? { id: doc.opportunity._id.toString(), title: doc.opportunity.title }
      : null,
  };
}

/** Audit write is awaited, but a logging failure never fails the request. */
async function writeAudit(entry) {
  try {
    await AuditLog.create(entry);
  } catch (err) {
    console.error("[audit] failed to write inquiry log:", err.message);
  }
}

// ── POST /api/opportunities/:id/inquiries ─────────────────────────────────────

async function createInquiry(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badId(res, "opportunity");

    const parsed = createInquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    // Only approved opportunities accept inquiries; startup comes from the DB.
    const opportunity = await Opportunity.findOne({ _id: id, status: "approved" })
      .select("startup")
      .lean();
    if (!opportunity) return notFound(res, "Opportunity not found");

    let inquiry;
    try {
      inquiry = await InvestorInquiry.create({
        opportunity: opportunity._id,
        startup: opportunity.startup,
        investor: req.user.id,
        message: parsed.data.message,
        // status defaults to "new"
        statusUpdatedBy: req.user.id,
      });
    } catch (err) {
      // The unique { investor, opportunity } index is the final duplicate guard.
      if (err.code === 11000) {
        return res.status(409).json({
          error: { code: "CONFLICT", message: "You have already sent an inquiry for this opportunity" },
        });
      }
      if (err.name === "ValidationError") return handleMongooseValidation(err, res);
      throw err;
    }

    await writeAudit({
      actor: req.user.id,
      action: AuditLog.ACTIONS.INQUIRY_CREATED,
      resourceType: "InvestorInquiry",
      resourceId: inquiry._id,
      newStatus: inquiry.status,
    });

    return res.status(201).json({
      data: { ...baseInquiry(inquiry), opportunity: opportunity._id.toString() },
    });
  } catch (err) {
    return next(err);
  }
}

// ── GET /api/inquiries/mine ───────────────────────────────────────────────────

async function listMyInquiries(req, res, next) {
  try {
    const parsed = listMyInquiriesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }
    const { page, limit, status } = parsed.data;

    // investor comes only from the session
    const filter = { investor: req.user.id, ...(status && { status }) };

    const [inquiries, total] = await Promise.all([
      InvestorInquiry.find(filter)
        .select("opportunity message status nextStep statusUpdatedAt createdAt updatedAt")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: "opportunity", select: "title stage fundingRequired startupSnapshot" })
        .lean(),
      InvestorInquiry.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: inquiries.map(investorInquiryDto),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return next(err);
  }
}

// ── GET /api/startups/me/inquiries ────────────────────────────────────────────

async function listStartupInquiries(req, res, next) {
  try {
    const parsed = listStartupInquiriesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }
    const { page, limit, status } = parsed.data;

    const startup = await Startup.findOne({ owner: req.user.id }).select("_id").lean();
    if (!startup) return notFound(res, "You do not have a startup profile yet");

    const filter = { startup: startup._id, ...(status && { status }) };

    const [inquiries, total] = await Promise.all([
      InvestorInquiry.find(filter)
        .select("opportunity investor message status nextStep statusUpdatedAt createdAt updatedAt")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: "investor", select: "fullName" }) // never email/passwordHash
        .populate({ path: "opportunity", select: "title" })
        .lean(),
      InvestorInquiry.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: inquiries.map(founderInquiryDto),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return next(err);
  }
}

// ── PATCH /api/inquiries/:id/status ───────────────────────────────────────────

async function updateInquiryStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return badId(res, "inquiry");

    const parsed = updateInquiryStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }
    const { status: nextStatus, nextStep } = parsed.data;

    const isInvestor = req.user.role === "investor";

    // Ownership comes from the database. Non-owners get 404 (no existence leak).
    let ownerFilter;
    if (isInvestor) {
      ownerFilter = { investor: req.user.id };
    } else {
      const startup = await Startup.findOne({ owner: req.user.id }).select("_id").lean();
      if (!startup) return notFound(res, "Inquiry not found");
      ownerFilter = { startup: startup._id };
    }

    const existing = await InvestorInquiry.findOne({ _id: id, ...ownerFilter })
      .select("status")
      .lean();
    if (!existing) return notFound(res, "Inquiry not found");

    // Investors may only withdraw (→ closed_lost); the pipeline belongs to the founder.
    if (isInvestor && (nextStatus !== "closed_lost" || nextStep !== undefined)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Investors can only close their own inquiry as closed_lost",
        },
      });
    }

    const previousStatus = existing.status;
    const allowed = InvestorInquiry.ALLOWED_TRANSITIONS[previousStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: `Cannot change status from '${previousStatus}' to '${nextStatus}'`,
        },
      });
    }

    // Atomic: matches record identity, ownership AND the expected current status.
    let updated;
    try {
      updated = await InvestorInquiry.findOneAndUpdate(
        { _id: id, ...ownerFilter, status: previousStatus },
        {
          $set: {
            status: nextStatus,
            statusUpdatedBy: req.user.id,
            statusUpdatedAt: new Date(),
            ...(nextStep !== undefined && { nextStep }),
          },
        },
        { new: true, runValidators: true }
      );
    } catch (err) {
      if (err.name === "ValidationError") return handleMongooseValidation(err, res);
      throw err;
    }

    if (!updated) {
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "Inquiry was modified by another request; please retry",
        },
      });
    }

    await writeAudit({
      actor: req.user.id,
      action: AuditLog.ACTIONS.INQUIRY_STATUS_CHANGED,
      resourceType: "InvestorInquiry",
      resourceId: updated._id,
      previousStatus,
      newStatus: nextStatus,
    });

    return res.status(200).json({ data: baseInquiry(updated) });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createInquiry, listMyInquiries, listStartupInquiries, updateInquiryStatus };
