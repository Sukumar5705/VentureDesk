"use strict";

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ── JWT helpers ────────────────────────────────────────────────────────────────

/**
 * Return the JWT secret from the environment.
 * Throws a structured error (logged as 500) if missing.
 * Warns once if the secret is under 32 characters.
 */
let _secretWarned = false;
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Do NOT fall back to a default or print the missing value
    console.error("[auth] JWT_SECRET is not set — cannot sign or verify tokens");
    const err = new Error("Server configuration error");
    err.statusCode = 500;
    err.isOperational = true;
    throw err;
  }
  if (!_secretWarned && secret.length < 32) {
    console.warn("[auth] JWT_SECRET is shorter than 32 characters — consider a stronger secret");
    _secretWarned = true;
  }
  return secret;
}

/**
 * Parse JWT_EXPIRES_IN env var and return both the JWT expiresIn string/number
 * and the cookie maxAge in milliseconds.
 */
function getTokenLifetime() {
  const raw = process.env.JWT_EXPIRES_IN || "2h";
  const match = raw.match(/^(\d+)(s|m|h|d)$/);
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const parsed = match ? parseInt(match[1], 10) * multipliers[match[2]] : 0;
  const maxAgeMs = parsed > 0 ? parsed : 2 * 3_600_000; // fallback 2h
  // jsonwebtoken treats a number as SECONDS, so token and cookie always agree
  return { expiresIn: Math.floor(maxAgeMs / 1000), maxAgeMs };
}

// ── Cookie options ─────────────────────────────────────────────────────────────

/**
 * Base cookie options (no maxAge — added separately when setting the cookie).
 */
function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

const COOKIE_NAME = "venturedesk_token";

// ── Middleware: protect ────────────────────────────────────────────────────────

/**
 * Reads the venturedesk_token cookie, verifies it (HS256 only),
 * loads the user from the DB, and sets req.user to a public object.
 */
async function protect(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });    }

    let secret;
    try {
      secret = getJwtSecret();
    } catch (err) {
      return res.status(500).json({ error: { code: "SERVER_ERROR", message: "Internal server error" } });
    }

    let payload;
    try {
      payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
    } catch {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "User not found" } });
    }

    req.user = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

// ── Middleware: authorize ──────────────────────────────────────────────────────

/**
 * Role-based access control. Must be used after protect().
 * Throws immediately if called with no roles (programming error).
 * Returns 401 if there is no req.user, 403 if the role is not in the list.
 *
 * @param {...string} roles
 */
function authorize(...roles) {
  if (roles.length === 0) {
    throw new Error("authorize() requires at least one role argument");
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "You do not have permission to access this resource" } });
    }
    return next();
  };
}

module.exports = { protect, authorize, getJwtSecret, getTokenLifetime, baseCookieOptions, COOKIE_NAME };
