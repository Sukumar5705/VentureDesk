"use strict";

const { z } = require("zod");
const InvestorInquiry = require("../models/InvestorInquiry");

const STATUS_VALUES = Object.keys(InvestorInquiry.ALLOWED_TRANSITIONS);

const paginationShape = {
  page: z
    .string()
    .regex(/^\d+$/, "page must be a positive integer")
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100000, "page must be >= 1")
    .optional()
    .default(1),
  limit: z
    .string()
    .regex(/^\d+$/, "limit must be a positive integer")
    .transform(Number)
    .refine((n) => n >= 1 && n <= 50, "limit must be between 1 and 50")
    .optional()
    .default(20),
  status: z
    .enum(STATUS_VALUES, { message: `status must be one of: ${STATUS_VALUES.join(", ")}` })
    .optional(),
};

/** POST /api/opportunities/:id/inquiries — only `message` is client-editable. */
const createInquirySchema = z
  .object({
    message: z
      .string({ error: "message is required" })
      .trim()
      .min(1, "message cannot be empty")
      .max(1000, "message must be 1000 characters or fewer"),
  })
  .strict();

/** GET /api/inquiries/mine */
const listMyInquiriesQuerySchema = z.object(paginationShape).strict();

/** GET /api/startups/me/inquiries */
const listStartupInquiriesQuerySchema = z.object(paginationShape).strict();

/** PATCH /api/inquiries/:id/status — status required, nextStep optional. */
const updateInquiryStatusSchema = z
  .object({
    status: z.enum(STATUS_VALUES, {
      error: `status must be one of: ${STATUS_VALUES.join(", ")}`,
    }),
    nextStep: z
      .string()
      .trim()
      .min(1, "nextStep cannot be empty")
      .max(500, "nextStep must be 500 characters or fewer")
      .optional(),
  })
  .strict();

module.exports = {
  createInquirySchema,
  listMyInquiriesQuerySchema,
  listStartupInquiriesQuerySchema,
  updateInquiryStatusSchema,
};
