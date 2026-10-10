"use strict";

const { z } = require("zod");

// Source of truth is Startup.js INDUSTRY_VALUES; this list must stay in sync.
// To avoid duplication, you can import from Startup.js instead:
//   const { INDUSTRY_VALUES } = require("../models/Startup");
// That requires exporting INDUSTRY_VALUES from Startup.js as a static or module export.
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

const websiteSchema = z
  .string()
  .trim()
  .max(300, "website must be 300 characters or fewer")
  .refine(
    (v) => {
      try {
        const url = new URL(v);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "website must be a valid http or https URL" }
  );

/**
 * POST /api/startups — all editable fields required except website.
 */
const createStartupSchema = z
  .object({
    name: z
      .string({ error: "name is required" })
      .trim()
      .min(1, "name cannot be empty")
      .max(100, "name must be 100 characters or fewer"),

    description: z
      .string({ error: "description is required" })
      .trim()
      .min(1, "description cannot be empty")
      .max(2000, "description must be 2000 characters or fewer"),

    industry: z.enum(INDUSTRY_VALUES, {
      error: `industry must be one of: ${INDUSTRY_VALUES.join(", ")}`,
    }),

    location: z
      .string({ error: "location is required" })
      .trim()
      .min(1, "location cannot be empty")
      .max(100, "location must be 100 characters or fewer"),

    website: websiteSchema.optional(),
  })
  .strict();

/**
 * PATCH /api/startups/me — every field optional, but at least one must be present.
 */
const updateStartupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "name cannot be empty")
      .max(100, "name must be 100 characters or fewer")
      .optional(),

    description: z
      .string()
      .trim()
      .min(1, "description cannot be empty")
      .max(2000, "description must be 2000 characters or fewer")
      .optional(),

    industry: z
      .enum(INDUSTRY_VALUES, {
        message: `industry must be one of: ${INDUSTRY_VALUES.join(", ")}`,
      })
      .optional(),

    location: z
      .string()
      .trim()
      .min(1, "location cannot be empty")
      .max(100, "location must be 100 characters or fewer")
      .optional(),

    website: websiteSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided for an update" }
  );

module.exports = { createStartupSchema, updateStartupSchema };
