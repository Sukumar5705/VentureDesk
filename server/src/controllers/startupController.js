"use strict";

const Startup = require("../models/Startup");
const { createStartupSchema, updateStartupSchema } = require("../validators/startupValidators");
const { formatZodError } = require("../validators/authValidators");

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Return only the explicit public fields of a startup document. */
function publicStartup(doc) {
  return {
    id: doc._id.toString(),
    owner: doc.owner.toString(),
    name: doc.name,
    description: doc.description,
    industry: doc.industry,
    location: doc.location,
    website: doc.website ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
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

/** Handle duplicate-key errors (code 11000) as 409 Conflict. */
function isDuplicateKey(err) {
  return err.code === 11000;
}

// ── POST /api/startups ─────────────────────────────────────────────────────────

async function createStartup(req, res, next) {
  try {
    const result = createStartupSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: formatZodError(result.error) });
    }

    const { name, description, industry, location, website } = result.data;

    let startup;
    try {
      startup = await Startup.create({
        // owner comes only from the authenticated session — never from the body
        owner: req.user.id,
        name,
        description,
        industry,
        location,
        ...(website !== undefined && { website }),
      });
    } catch (err) {
      if (isDuplicateKey(err)) {
        return res.status(409).json({
          error: { code: "CONFLICT", message: "You already have a startup profile" },
        });
      }
      if (err.name === "ValidationError") return handleMongooseValidation(err, res);
      throw err;
    }

    return res.status(201).json({ data: publicStartup(startup) });
  } catch (err) {
    return next(err);
  }
}

// ── GET /api/startups/me ───────────────────────────────────────────────────────

async function getMyStartup(req, res, next) {
  try {
    const startup = await Startup.findOne({ owner: req.user.id }).lean();
    if (!startup) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "You do not have a startup profile yet" },
      });
    }
    return res.status(200).json({ data: publicStartup(startup) });
  } catch (err) {
    return next(err);
  }
}

// ── PATCH /api/startups/me ─────────────────────────────────────────────────────

async function updateMyStartup(req, res, next) {
  try {
    const result = updateStartupSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: formatZodError(result.error) });
    }

    const updates = result.data; // already validated; no owner/system fields possible

    let startup;
    try {
      // Query by owner so a founder can only ever update their own profile.
      // runValidators: true ensures Mongoose schema constraints are checked.
      startup = await Startup.findOneAndUpdate(
        { owner: req.user.id },
        { $set: updates },
        { new: true, runValidators: true }

      );
    } catch (err) {
      if (err.name === "ValidationError") return handleMongooseValidation(err, res);
      throw err;
    }

    if (!startup) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "You do not have a startup profile yet" },
      });
    }

    return res.status(200).json({ data: publicStartup(startup) });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createStartup, getMyStartup, updateMyStartup };

