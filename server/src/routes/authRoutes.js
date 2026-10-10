"use strict";

const { Router } = require("express");
const { rateLimit } = require("express-rate-limit");
const { register, login, logout, me } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_RATE_LIMIT_MAX = 20;                    // per IP per window

const makeLimiter = (extra = {}) =>
  rateLimit({
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    limit: AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    ...extra,
    handler(req, res) {
      return res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests, please try again later",
          details: [],
        },
      });
    },
  });

const registerLimiter = makeLimiter();
const loginLimiter = makeLimiter({ skipSuccessfulRequests: true });

const router = Router();

router.post("/register", registerLimiter, register);
router.post("/login",    loginLimiter,    login);
router.post("/logout",                    logout);
router.get( "/me",       protect,         me);

module.exports = router;