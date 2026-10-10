
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const mongoose = require("mongoose");

const app = express();
app.set("trust proxy", 1);

// Security headers
app.disable("x-powered-by");
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigin = process.env.CLIENT_ORIGIN;

      // Allow requests without an Origin header, such as curl.
      if (!origin || origin === allowedOrigin) {
        return callback(null, true);
      }

      const error = new Error("Origin not allowed by CORS");
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
  })
);

// Request parsing
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());

// Health check
app.get("/api/health", (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    api: "VentureDesk API",
    database: databaseConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);



// Auth routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Startup profile routes
const startupRoutes = require("./routes/startupRoutes");
app.use("/api/startups", startupRoutes);

// Opportunity routes (founder)
const opportunityRoutes = require("./routes/opportunityRoutes");
app.use("/api/opportunities", opportunityRoutes);

// Opportunity routes (admin)
const adminOpportunityRoutes = require("./routes/adminOpportunityRoutes");
app.use("/api/admin/opportunities", adminOpportunityRoutes);

// Investor inquiry routes
const inquiryRoutes = require("./routes/inquiryRoutes");
app.use("/api/inquiries", inquiryRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = err.statusCode || err.status || 500;
  let code = "SERVER_ERROR";
  let message = "Internal server error";

  if (err.type === "entity.parse.failed") {
    statusCode = 400; code = "BAD_REQUEST"; message = "Malformed JSON body";
  } else if (err.type === "entity.too.large") {
    statusCode = 413; code = "PAYLOAD_TOO_LARGE"; message = "Request body too large";
  } else if (statusCode === 403) {
    code = "FORBIDDEN"; message = err.message;
  } else if (statusCode < 500) {
    code = "BAD_REQUEST"; message = err.message;
  }

  if (statusCode >= 500) console.error(err);
  res.status(statusCode).json({ error: { code, message } });
});
module.exports = app;
