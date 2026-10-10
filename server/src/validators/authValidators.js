"use strict";

const { z } = require("zod");

// bcrypt only uses the first 72 BYTES, so check bytes, not characters
const bytes72 = (v) => Buffer.byteLength(v, "utf8") <= 72;
const BYTES_MSG = "password must be 72 bytes or fewer";

const registerSchema = z
  .object({
    fullName: z
      .string({ error: "fullName is required" })
      .trim()
      .min(1, "fullName cannot be empty")
      .max(100, "fullName must be 100 characters or fewer"),

    email: z
      .string({ error: "email is required" })
      .trim()
      .toLowerCase()
      .email("email must be a valid email address")
      .max(254, "email must be 254 characters or fewer"),

    password: z
      .string({ error: "password is required" })
      .min(8, "password must be at least 8 characters")
      .refine(bytes72, BYTES_MSG),

    role: z.enum(["founder", "investor"], {
      error: 'role must be "founder" or "investor"',
    }),
  })
  .strict();

const loginSchema = z
  .object({
    email: z
      .string({ error: "email is required" })
      .trim()
      .toLowerCase()
      .email("email must be a valid email address"),

    password: z
      .string({ error: "password is required" })
      .min(1, "password cannot be empty")
      .refine(bytes72, BYTES_MSG),
  })
  .strict();

function formatZodError(zodError) {
  const issues = zodError.issues ?? zodError.errors ?? [];
  const details = issues.map((e) => ({
    field: e.path.join(".") || "body",
    message: e.message,
  }));
  return { code: "VALIDATION_ERROR", message: "Validation failed", details };
}

module.exports = { registerSchema, loginSchema, formatZodError };