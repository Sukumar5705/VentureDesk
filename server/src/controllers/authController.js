"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { registerSchema, loginSchema, formatZodError } = require("../validators/authValidators");
const {
  getJwtSecret,
  getTokenLifetime,
  baseCookieOptions,
  COOKIE_NAME,
} = require("../middleware/authMiddleware");

const BCRYPT_COST = 12;

// A pre-hashed dummy value used to equalise timing on unknown-email logins.
// Generated once at startup; never returned to clients.
const DUMMY_HASH = bcrypt.hashSync("__venturedesk_dummy__", BCRYPT_COST);

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Pick only the public fields from a User document. */
function publicUser(user) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

// ── POST /register ─────────────────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: formatZodError(result.error) });
    }

    const { fullName, email, password, role } = result.data;

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    let user;
    try {
      user = await User.create({ fullName, email, passwordHash, role });
    } catch (err) {
      // MongoDB duplicate-key error (unique index on email)
      if (err.code === 11000) {
        return res.status(409).json({
          error: { code: "CONFLICT", message: "Email is already registered" },
        });
      }
      // Mongoose validation error surfaced from the DB layer
      if (err.name === "ValidationError") {
        const details = Object.values(err.errors).map((e) => ({
          field: e.path,
          message: e.message,
        }));
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Validation failed", details },
        });
      }
      throw err;
    }

    return res.status(201).json({ data: publicUser(user) });
  } catch (err) {
    return next(err);
  }
}

// ── POST /login ────────────────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: formatZodError(result.error) });
    }

    const { email, password } = result.data;

    // Always run bcrypt.compare so response time is the same for unknown emails
    const user = await User.findOne({ email }).select("+passwordHash").lean();
    const hashToCheck = user ? user.passwordHash : DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordMatch) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Invalid email or password" },
      });
    }

    let secret, expiresIn, maxAgeMs;
    try {
      secret = getJwtSecret();
      ({ expiresIn, maxAgeMs } = getTokenLifetime());
    } catch (err) {
      // JWT_SECRET missing — already logged inside getJwtSecret()
      return res.status(500).json({
        error: { code: "SERVER_ERROR", message: "Internal server error" },
      });
    }

    // sub = user id only; no role in the token
    const token = jwt.sign({ sub: user._id.toString() }, secret, {
      algorithm: "HS256",
      expiresIn,
    });

    res.cookie(COOKIE_NAME, token, {
      ...baseCookieOptions(),
      maxAge: maxAgeMs,
    });

    // Never return the token or hash in the response body
    return res.status(200).json({ data: publicUser(user) });
  } catch (err) {
    return next(err);
  }
}

// ── POST /logout ───────────────────────────────────────────────────────────────

function logout(req, res) {
  // Idempotent: always clears the cookie and returns 200, even with no cookie.
  res.clearCookie(COOKIE_NAME, baseCookieOptions());
  return res.status(200).json({ data: { message: "Logged out successfully" } });
}

// ── GET /me ────────────────────────────────────────────────────────────────────

function me(req, res) {
  // req.user is set by the protect middleware
  return res.status(200).json({ data: req.user });
}

module.exports = { register, login, logout, me };
