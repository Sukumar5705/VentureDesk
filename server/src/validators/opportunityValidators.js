"use strict";

const { z } = require("zod");

const STAGE_VALUES = [
  "pre_seed",
  "seed",
  "series_a",
  "series_b",
  "series_c_plus",
  "other",
];

const REVIEW_DECISION_VALUES = ["approved", "changes_requested", "rejected"];

// ── Founder schemas ────────────────────────────────────────────────────────────

/**
 * POST /api/opportunities — only title is required for a draft.
 * All other funding fields are optional so incomplete drafts can be saved.
 * 
 */

const publicListQuerySchema = z
  .object({
    page: z.preprocess(
      (v) => (v === undefined ? 1 : v),
      z.coerce.number().int().min(1)
    ),
    limit: z.preprocess(
      (v) => (v === undefined ? 20 : v),
      z.coerce.number().int().min(1).max(100)
    ),
    search: z.string().trim().max(100).optional(),
    industry: z.string().trim().optional(),
    stage: z.enum(STAGE_VALUES).optional(),
    location: z.string().trim().max(100).optional(),
    minFunding: z.coerce.number().int().min(0).optional(),
    maxFunding: z.coerce.number().int().min(0).optional(),
    sortBy: z
      .enum(["publishedAt", "fundingRequired", "createdAt"])
      .optional()
      .default("publishedAt"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .strict()
  .refine(
    (data) =>
      data.minFunding === undefined ||
      data.maxFunding === undefined ||
      data.minFunding <= data.maxFunding,
    {
      message: "minFunding cannot exceed maxFunding",
      path: ["maxFunding"],
    }
  );

const createOpportunitySchema = z
  .object({
    title: z
      .string({ required_error: "title is required" })
      .trim()
      .min(1, "title cannot be empty")
      .max(150, "title must be 150 characters or fewer"),

    stage: z
      .enum(STAGE_VALUES, {
        message: `stage must be one of: ${STAGE_VALUES.join(", ")}`,
      })
      .optional(),

    fundingRequired: z
      .number()
      .int("fundingRequired must be a whole number (INR)")
      .min(1, "fundingRequired must be a positive integer")
      .optional(),

    description: z
      .string()
      .trim()
      .min(1, "description cannot be empty")
      .max(2000, "description must be 2000 characters or fewer")
      .optional(),

    useOfFunds: z
      .string()
      .trim()
      .min(1, "useOfFunds cannot be empty")
      .max(2000, "useOfFunds must be 2000 characters or fewer")
      .optional(),
  })
  .strict();

/**
 * PATCH /api/opportunities/:id — partial update of editable fields.
 * At least one field must be present. System/ownership/review fields are excluded.
 */
const updateOpportunitySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "title cannot be empty")
      .max(150, "title must be 150 characters or fewer")
      .optional(),

    stage: z
      .enum(STAGE_VALUES, {
        message: `stage must be one of: ${STAGE_VALUES.join(", ")}`,
      })
      .optional(),

    fundingRequired: z
      .number()
      .int("fundingRequired must be a whole number (INR)")
      .min(1, "fundingRequired must be a positive integer")
      .optional(),

    description: z
      .string()
      .trim()
      .min(1, "description cannot be empty")
      .max(2000, "description must be 2000 characters or fewer")
      .optional(),

    useOfFunds: z
      .string()
      .trim()
      .min(1, "useOfFunds cannot be empty")
      .max(2000, "useOfFunds must be 2000 characters or fewer")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for an update",
  });

// ── Admin schemas ──────────────────────────────────────────────────────────────

/**
 * PATCH /api/admin/opportunities/:id/review
 *
 * - `decision` is always required.
 * - `reviewNote` is required (non-empty) for changes_requested and rejected.
 *   Zod validates this; the Mongoose pre('validate') hook does NOT run on
 *   findOneAndUpdate, so Zod is the authoritative gate here.
 */
const reviewOpportunitySchema = z
  .object({
    decision: z.enum(REVIEW_DECISION_VALUES, {
      required_error: "decision is required",
      message: `decision must be one of: ${REVIEW_DECISION_VALUES.join(", ")}`,
    }),

    reviewNote: z
      .string()
      .trim()
      .min(1, "reviewNote cannot be empty")
      .max(1000, "reviewNote must be 1000 characters or fewer")
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      (data.decision === "changes_requested" || data.decision === "rejected") &&
      (!data.reviewNote || data.reviewNote.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewNote"],
        message: `reviewNote is required when decision is '${data.decision}'`,
      });
    }
  });

/**
 * GET /api/admin/opportunities — query params
 */
const adminListQuerySchema = z
  .object({
    status: z
      .enum(
        ["draft", "pending_review", "changes_requested", "approved", "rejected"],
        { message: "status filter must be a valid opportunity status" }
      )
      .optional()
      .default("pending_review"),

    page: z
      .string()
      .regex(/^\d+$/, "page must be a positive integer")
      .transform(Number)
      .refine((n) => n >= 1, "page must be >= 1")
      .optional()
      .default("20"),

    limit: z
      .string()
      .regex(/^\d+$/, "limit must be a positive integer")
      .transform(Number)
      .refine((n) => n >= 1 && n <= 100, "limit must be between 1 and 100")
      .optional()
      .default("20"),
  })
  .strict();

module.exports = {
  createOpportunitySchema,
  updateOpportunitySchema,
  reviewOpportunitySchema,
  adminListQuerySchema,
  publicListQuerySchema,
};
