"use strict";

const { Router } = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  listPublicOpportunities,
  createOpportunity,
  listMyOpportunities,
  updateOpportunity,
  submitOpportunity,
} = require("../controllers/opportunityController");
const { createInquiry } = require("../controllers/inquiryController");

const router = Router();

// All founder opportunity endpoints require authentication and the founder role
const founderOnly = [protect, authorize("founder")];

// Public discovery endpoint — unauthenticated
router.get("/",                ...[], listPublicOpportunities);

// Founder-only endpoints
router.post("/",               ...founderOnly, createOpportunity);
router.get("/mine",            ...founderOnly, listMyOpportunities);
router.patch("/:id",           ...founderOnly, updateOpportunity);
router.post("/:id/submit",     ...founderOnly, submitOpportunity);

// Investor inquiry creation on a public opportunity
router.post("/:id/inquiries",  protect, authorize("investor"), createInquiry);

module.exports = router;
