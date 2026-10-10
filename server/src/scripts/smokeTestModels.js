"use strict";

/**
 * Offline smoke test for VentureDesk Phase 1 models.
 * Does NOT connect to MongoDB — verifies schema structure only.
 *
 * Run: node src/scripts/smokeTestModels.js
 */

const mongoose = require("mongoose");
const {
  User,
  Startup,
  Opportunity,
  InvestorInquiry,
  AuditLog,
} = require("../models");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

/** Validate a document; return the ValidationError or null. */
async function getValidationError(doc) {
  try {
    await doc.validate();
    return null;
  } catch (err) {
    return err;
  }
}

async function run() {
  // ── 1. Imports ──────────────────────────────────────────────────────────────
  console.log("\n[1] Model imports");
  assert(User && User.modelName === "User", "User imported");
  assert(Startup && Startup.modelName === "Startup", "Startup imported");
  assert(
    Opportunity && Opportunity.modelName === "Opportunity",
    "Opportunity imported"
  );
  assert(
    InvestorInquiry && InvestorInquiry.modelName === "InvestorInquiry",
    "InvestorInquiry imported"
  );
  assert(AuditLog && AuditLog.modelName === "AuditLog", "AuditLog imported");

  // ── 2. Collection names ─────────────────────────────────────────────────────
  console.log("\n[2] Collection names");
  assert(User.collection.name === "users", "User → users");
  assert(Startup.collection.name === "startups", "Startup → startups");
  assert(
    Opportunity.collection.name === "opportunities",
    "Opportunity → opportunities"
  );
  assert(
    InvestorInquiry.collection.name === "investor_inquiries",
    "InvestorInquiry → investor_inquiries"
  );
  assert(AuditLog.collection.name === "audit_logs", "AuditLog → audit_logs");

  // ── 3. ObjectId references ──────────────────────────────────────────────────
  console.log("\n[3] ObjectId references");
  const startupPaths = Startup.schema.paths;
  assert(
    startupPaths.owner.instance === "ObjectId" &&
      startupPaths.owner.options.ref === "User",
    "Startup.owner → User"
  );

  const oppPaths = Opportunity.schema.paths;
  assert(
    oppPaths.startup.instance === "ObjectId" &&
      oppPaths.startup.options.ref === "Startup",
    "Opportunity.startup → Startup"
  );
  assert(
    oppPaths.reviewedBy.instance === "ObjectId" &&
      oppPaths.reviewedBy.options.ref === "User",
    "Opportunity.reviewedBy → User"
  );

  const iiPaths = InvestorInquiry.schema.paths;
  assert(
    iiPaths.opportunity.instance === "ObjectId" &&
      iiPaths.opportunity.options.ref === "Opportunity",
    "InvestorInquiry.opportunity → Opportunity"
  );
  assert(
    iiPaths.startup.instance === "ObjectId" &&
      iiPaths.startup.options.ref === "Startup",
    "InvestorInquiry.startup → Startup"
  );
  assert(
    iiPaths.investor.instance === "ObjectId" &&
      iiPaths.investor.options.ref === "User",
    "InvestorInquiry.investor → User"
  );

  const auditPaths = AuditLog.schema.paths;
  assert(
    auditPaths.actor.instance === "ObjectId" &&
      auditPaths.actor.options.ref === "User",
    "AuditLog.actor → User"
  );
  assert(
    auditPaths.resourceId.instance === "ObjectId",
    "AuditLog.resourceId is ObjectId (polymorphic)"
  );

  // ── 4. Enums ────────────────────────────────────────────────────────────────
  console.log("\n[4] Enums");
  const userRoleEnum = User.schema.paths.role.enumValues;
  assert(
    ["founder", "investor", "admin"].every((v) => userRoleEnum.includes(v)) &&
      userRoleEnum.length === 3,
    "User.role enum (3 values)"
  );

  const industryEnum = Startup.schema.paths.industry.enumValues;
  assert(
    industryEnum.includes("ai_ml") && industryEnum.includes("other"),
    "Startup.industry enum includes ai_ml and other"
  );
  assert(industryEnum.length === 13, "Startup.industry has 13 values");

  const stageEnum = Opportunity.schema.paths.stage.enumValues;
  assert(
    [
      "pre_seed",
      "seed",
      "series_a",
      "series_b",
      "series_c_plus",
      "other",
    ].every((v) => stageEnum.includes(v)),
    "Opportunity.stage enum (6 values)"
  );

  const oppStatusEnum = Opportunity.schema.paths.status.enumValues;
  assert(
    [
      "draft",
      "pending_review",
      "changes_requested",
      "approved",
      "rejected",
    ].every((v) => oppStatusEnum.includes(v)),
    "Opportunity.status enum (5 values)"
  );

  const iiStatusEnum = InvestorInquiry.schema.paths.status.enumValues;
  assert(
    [
      "new",
      "contacted",
      "meeting_scheduled",
      "due_diligence",
      "closed_won",
      "closed_lost",
    ].every((v) => iiStatusEnum.includes(v)),
    "InvestorInquiry.status enum (6 values)"
  );

  const auditResourceEnum = AuditLog.schema.paths.resourceType.enumValues;
  assert(
    ["Startup", "Opportunity", "InvestorInquiry"].every((v) =>
      auditResourceEnum.includes(v)
    ),
    "AuditLog.resourceType enum (3 values)"
  );

  // ── 5. Indexes ──────────────────────────────────────────────────────────────
  console.log("\n[5] Index declarations (schema-level)");

  function schemaIndexes(model) {
    return model.schema.indexes();
  }

  const userIndexes = schemaIndexes(User);
  assert(
    userIndexes.some(
      ([fields, opts]) => fields.email === 1 && opts.unique === true
    ),
    "User: unique index on email"
  );

  const startupIndexes = schemaIndexes(Startup);
  assert(
    startupIndexes.some(
      ([fields, opts]) => fields.owner === 1 && opts.unique === true
    ),
    "Startup: unique index on owner"
  );

  const iiIndexes = schemaIndexes(InvestorInquiry);
  assert(
    iiIndexes.some(
      ([fields, opts]) =>
        fields.investor === 1 &&
        fields.opportunity === 1 &&
        opts.unique === true
    ),
    "InvestorInquiry: unique compound index { investor, opportunity }"
  );

  const oppIndexes = schemaIndexes(Opportunity);
  assert(
    oppIndexes.some(
      ([fields]) => fields.status === 1 && fields.publishedAt === -1
    ),
    "Opportunity: index { status, publishedAt }"
  );
  assert(
    oppIndexes.some(
      ([fields]) => fields.status === 1 && fields.submittedAt === -1
    ),
    "Opportunity: index { status, submittedAt }"
  );

  // ── 6. Hidden password selection ────────────────────────────────────────────
  console.log("\n[6] Hidden password selection");
  assert(
    User.schema.paths.passwordHash.options.select === false,
    "User.passwordHash has select: false"
  );

  // ── 7. Defaults ─────────────────────────────────────────────────────────────
  console.log("\n[7] Defaults");
  assert(
    Opportunity.schema.paths.status.defaultValue === "draft",
    "Opportunity.status defaults to 'draft'"
  );
  assert(
    InvestorInquiry.schema.paths.status.defaultValue === "new",
    "InvestorInquiry.status defaults to 'new'"
  );

  // ── 8. AuditLog: no updatedAt ────────────────────────────────────────────────
  console.log("\n[8] AuditLog timestamps");
  assert(!!AuditLog.schema.paths.createdAt, "AuditLog has createdAt");
  assert(!AuditLog.schema.paths.updatedAt, "AuditLog has no updatedAt");

  // ── 9. Incomplete draft validation ──────────────────────────────────────────
  console.log("\n[9] Draft can be saved with only required fields");
  const draft = new Opportunity({
    startup: new mongoose.Types.ObjectId(),
    title: "Series A round",
    status: "draft",
  });
  const draftErr = await getValidationError(draft);
  assert(!draftErr, "Opportunity draft with only startup+title+status is valid");

  // ── 10. reviewNote validation ────────────────────────────────────────────────
  console.log("\n[10] reviewNote required for changes_requested / rejected");

  const rejectedNoNote = new Opportunity({
    startup: new mongoose.Types.ObjectId(),
    title: "Some opportunity",
    status: "rejected",
    // reviewNote intentionally omitted
  });
  const rejectedErr = await getValidationError(rejectedNoNote);
  assert(
    rejectedErr && rejectedErr.errors.reviewNote,
    "Rejected without reviewNote fails validation"
  );

  const rejectedWithNote = new Opportunity({
    startup: new mongoose.Types.ObjectId(),
    title: "Some opportunity",
    status: "rejected",
    reviewNote: "Insufficient traction",
  });
  const rejectedOkErr = await getValidationError(rejectedWithNote);
  assert(!rejectedOkErr, "Rejected with reviewNote passes validation");

  const changesNoNote = new Opportunity({
    startup: new mongoose.Types.ObjectId(),
    title: "Some opportunity",
    status: "changes_requested",
  });
  const changesErr = await getValidationError(changesNoNote);
  assert(
    changesErr && changesErr.errors.reviewNote,
    "changes_requested without reviewNote fails validation"
  );

  // ── 11. Startup website URL validator ───────────────────────────────────────
  console.log("\n[11] Startup website validation");
  const startupBadUrl = new Startup({
    owner: new mongoose.Types.ObjectId(),
    name: "Acme",
    description: "A startup",
    industry: "fintech",
    location: "Hyderabad",
    website: "not-a-url",
  });
  const urlErr = await getValidationError(startupBadUrl);
  assert(urlErr && urlErr.errors.website, "Invalid website URL fails validation");

  const startupGoodUrl = new Startup({
    owner: new mongoose.Types.ObjectId(),
    name: "Acme",
    description: "A startup",
    industry: "fintech",
    location: "Hyderabad",
    website: "https://acme.io",
  });
  const urlOkErr = await getValidationError(startupGoodUrl);
  assert(!urlOkErr, "Valid https website URL passes validation");

  // ── 12. InvestorInquiry.ALLOWED_TRANSITIONS static ──────────────────────────
  console.log("\n[12] InvestorInquiry.ALLOWED_TRANSITIONS static");
  const t = InvestorInquiry.ALLOWED_TRANSITIONS;
  assert(
    Array.isArray(t.new) &&
      t.new.includes("contacted") &&
      t.new.includes("closed_lost"),
    "new → contacted | closed_lost"
  );
  assert(
    Array.isArray(t.closed_won) && t.closed_won.length === 0,
    "closed_won is terminal"
  );
  assert(
    Array.isArray(t.closed_lost) && t.closed_lost.length === 0,
    "closed_lost is terminal"
  );

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Smoke test complete: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exitCode = 1;
});
