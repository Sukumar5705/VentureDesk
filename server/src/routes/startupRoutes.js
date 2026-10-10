"use strict";

const { Router } = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const { createStartup, getMyStartup, updateMyStartup } = require("../controllers/startupController");

const { listStartupInquiries } = require("../controllers/inquiryController");

const router = Router();

// All startup profile endpoints require authentication and the founder role.
router.use(protect, authorize("founder"));

router.post("/", createStartup);
router.get("/me", getMyStartup);
router.patch("/me", updateMyStartup);
router.get("/me/inquiries", listStartupInquiries);

module.exports = router;
