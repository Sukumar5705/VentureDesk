"use strict";

const { Router } = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  adminListOpportunities,
  adminGetOpportunity,
  reviewOpportunity,
} = require("../controllers/opportunityController");

const router = Router();

// All admin opportunity endpoints require authentication and the admin role
router.use(protect, authorize("admin"));

router.get("/",              adminListOpportunities);
router.get("/:id",           adminGetOpportunity);
router.patch("/:id/review",  reviewOpportunity);

module.exports = router;
