"use strict";

const { Router } = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const { listMyInquiries, updateInquiryStatus } = require("../controllers/inquiryController");

const router = Router();

router.get("/mine", protect, authorize("investor"), listMyInquiries);

// Investors (own inquiry only) and founders (own startup only); admins get 403.
router.patch("/:id/status", protect, authorize("investor", "founder"), updateInquiryStatus);

module.exports = router;
