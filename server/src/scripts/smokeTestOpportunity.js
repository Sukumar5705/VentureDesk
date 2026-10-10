"use strict";

/**
 * Offline smoke test — Phase 4: Opportunity Workflow.
 * No real DB connection; User, Startup, Opportunity, AuditLog stubbed in memory.
 * Run: node src/scripts/smokeTestOpportunity.js
 */

const http  = require("http");
const mongoose = require("mongoose");
const jwt   = require("jsonwebtoken");

// ── In-memory stores ──────────────────────────────────────────────────────────
const userStore    = new Map(); // id-string → user doc
const startupStore = new Map(); // ownerId-string → startup doc
const oppStore     = new Map(); // id-string → opportunity doc
const auditStore   = [];

function makeId() { return new mongoose.Types.ObjectId(); }

// ── Stub User ─────────────────────────────────────────────────────────────────
const User = require("../models/User");
User.findById = async (id) => {
  const doc = userStore.get(id.toString());
  if (!doc) return null;
  const { passwordHash: _, ...pub } = doc;
  return pub;
};
// findOne needed by auth middleware (login flow not exercised here)
User.findOne = () => ({ select: () => ({ lean: () => Promise.resolve(null) }), then: (r) => r(null) });

// ── Stub Startup ──────────────────────────────────────────────────────────────
const Startup = require("../models/Startup");
Startup.findOne = (q) => {
  const ownerId = q?.owner?.toString?.() ?? q?.owner;
  return { lean: () => Promise.resolve(startupStore.get(ownerId) ?? null) };
};

// ── Stub Opportunity ──────────────────────────────────────────────────────────
const Opportunity = require("../models/Opportunity");

Opportunity.create = async (data) => {
  const doc = {
    _id: makeId(),
    startup: data.startup,
    title: data.title,
    stage: data.stage ?? undefined,
    fundingRequired: data.fundingRequired ?? undefined,
    description: data.description ?? undefined,
    useOfFunds: data.useOfFunds ?? undefined,
    status: "draft",
    startupSnapshot: undefined,
    submittedAt: undefined,
    reviewedBy: undefined,
    reviewedAt: undefined,
    reviewNote: undefined,
    publishedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  oppStore.set(doc._id.toString(), doc);
  return doc;
};

Opportunity.find = (q) => {
  const filtered = [...oppStore.values()].filter((d) => {
    if (q.startup && d.startup.toString() !== q.startup.toString()) return false;
    if (q.status  && d.status !== q.status) return false;
    return true;
  });
  // Return a chainable that supports .sort().skip().limit().lean()
  const chain = {
    sort:  () => chain,
    skip:  () => chain,
    limit: () => chain,
    lean:  () => Promise.resolve(filtered),
  };
  return chain;
};

Opportunity.countDocuments = async (q) => {
  return [...oppStore.values()].filter((d) => {
    if (q.status && d.status !== q.status) return false;
    return true;
  }).length;
};

Opportunity.findOne = (q) => {
  // Supports both await and .lean() chaining
  const resolve = () => {
    for (const doc of oppStore.values()) {
      const idMatch  = !q._id    || doc._id.toString()     === q._id.toString();
      const stMatch  = !q.startup || doc.startup.toString() === q.startup.toString();
      const stStatus = !q.status  || doc.status === q.status;
      if (idMatch && stMatch && stStatus) return { ...doc };
    }
    return null;
  };
  return {
    lean: () => Promise.resolve(resolve()),
    then: (r, j) => Promise.resolve(resolve()).then(r, j),
  };
};

// findOneAndUpdate: atomic conditional update
Opportunity.findOneAndUpdate = async (filter, update, opts) => {
  const id = filter._id?.toString();
  const doc = id ? oppStore.get(id) : null;
  if (!doc) return null;
  // Check all filter conditions
  if (filter.startup && doc.startup.toString() !== filter.startup.toString()) return null;
  if (filter.status  && doc.status !== filter.status) return null;
  // Apply $set
  const delta = update["$set"] ?? {};
  const updated = { ...doc, ...delta, updatedAt: new Date() };
  oppStore.set(id, updated);
  return updated;
};

Opportunity.findById = (id) => {
  const doc = oppStore.get(id.toString()) ?? null;
  return {
    lean: () => Promise.resolve(doc ? { ...doc } : null),
    then: (r, j) => Promise.resolve(doc ? { ...doc } : null).then(r, j),
  };
};

// ── Stub AuditLog ─────────────────────────────────────────────────────────────
const AuditLog = require("../models/AuditLog");
AuditLog.create = async (data) => {
  auditStore.push({ ...data, _id: makeId(), createdAt: new Date() });
  return auditStore[auditStore.length - 1];
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────
process.env.JWT_SECRET    = "a-sufficiently-long-secret-for-testing-32chars!!";
process.env.JWT_EXPIRES_IN = "2h";
process.env.NODE_ENV      = "test";

const app = require("../app");

// Splice test route before 404 handler (same pattern as prior tests)
(function () {
  const testRouter = require("express").Router();
  const { protect, authorize } = require("../middleware/authMiddleware");
  testRouter.get("/api/__test_investor__", protect, authorize("investor"), (req, res) =>
    res.status(200).json({ ok: true })
  );
  app.router.stack.splice(app.router.stack.length - 2, 0, ...testRouter.stack);
})();

let server, OBASE, ABASE;

async function startServer() {
  await new Promise((r) => {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      OBASE = `http://127.0.0.1:${port}/api/opportunities`;
      ABASE = `http://127.0.0.1:${port}/api/admin/opportunities`;
      r();
    });
  });
}
async function stopServer() { await new Promise((r) => server.close(r)); }

// ── Helpers ───────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;

function assert(cond, label) {
  if (cond) { console.log(`  PASS  ${label}`); passed++; }
  else       { console.error(`  FAIL  ${label}`); failed++; }
}

async function api(method, url, { body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(url, {
    method, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json; try { json = await res.json(); } catch { json = null; }
  return { status: res.status, json };
}

/** Seed a user and return a cookie string with their JWT. */
function seedUser(fullName, email, role) {
  const doc = {
    _id: makeId(),
    fullName, email, role,
    createdAt: new Date(), updatedAt: new Date(),
  };
  userStore.set(doc._id.toString(), doc);
  const token = jwt.sign(
    { sub: doc._id.toString() },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "2h" }
  );
  return { cookie: `venturedesk_token=${token}`, userId: doc._id.toString(), doc };
}

/** Seed a startup for a given ownerId and return it. */
function seedStartup(ownerId, overrides = {}) {
  const doc = {
    _id: makeId(),
    owner: { toString: () => ownerId },
    name: "AcmeCorp",
    description: "A fintech startup",
    industry: "fintech",
    location: "Hyderabad",
    website: "https://acme.io",
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
  startupStore.set(ownerId, doc);
  return doc;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testDraftCreation() {
  console.log("\n[1] Draft creation");

  const { cookie, userId } = seedUser("Founder F1", "f1@test.com", "founder");
  seedStartup(userId);

  // Valid create — title only
  const r1 = await api("POST", OBASE, { body: { title: "Series A" }, cookie });
  assert(r1.status === 201, "create draft with title only returns 201");
  const d = r1.json?.data;
  assert(d?.id && d?.title === "Series A" && d?.status === "draft", "draft has correct fields");
  assert(d?.stage === null && d?.fundingRequired === null, "optional fields null when absent");

  // Valid create — all fields
  const r2 = await api("POST", OBASE, {
    body: { title: "Seed Round", stage: "seed", fundingRequired: 5000000, description: "D", useOfFunds: "U" },
    cookie,
  });
  assert(r2.status === 201, "create draft with all fields returns 201");
  assert(r2.json?.data?.stage === "seed" && r2.json?.data?.fundingRequired === 5000000, "all fields stored");

  // No startup — 404
  const { cookie: c2 } = seedUser("Founder NoSt", "f-nost@test.com", "founder");
  const r3 = await api("POST", OBASE, { body: { title: "X" }, cookie: c2 });
  assert(r3.status === 404, "create without startup profile returns 404");
}

async function testValidationOnCreate() {
  console.log("\n[2] Create validation");

  const { cookie, userId } = seedUser("Founder Val", "fval@test.com", "founder");
  seedStartup(userId);

  // Missing title
  const r1 = await api("POST", OBASE, { body: {}, cookie });
  assert(r1.status === 400, "missing title returns 400");
  assert(r1.json?.error?.code === "VALIDATION_ERROR", "returns VALIDATION_ERROR code");

  // Invalid stage
  const r2 = await api("POST", OBASE, { body: { title: "T", stage: "unicorn" }, cookie });
  assert(r2.status === 400, "invalid stage returns 400");

  // Non-integer fundingRequired
  const r3 = await api("POST", OBASE, { body: { title: "T", fundingRequired: 1.5 }, cookie });
  assert(r3.status === 400, "non-integer fundingRequired returns 400");

  // Zero fundingRequired
  const r4 = await api("POST", OBASE, { body: { title: "T", fundingRequired: 0 }, cookie });
  assert(r4.status === 400, "zero fundingRequired returns 400");

  // Unknown field (strict mode)
  const r5 = await api("POST", OBASE, { body: { title: "T", startup: "hacked" }, cookie });
  assert(r5.status === 400, "startup in body rejected by strict schema");

  const r6 = await api("POST", OBASE, { body: { title: "T", status: "approved" }, cookie });
  assert(r6.status === 400, "status in body rejected by strict schema");
}

async function testListMine() {
  console.log("\n[3] GET /mine");

  const { cookie, userId } = seedUser("Founder List", "flist@test.com", "founder");
  seedStartup(userId);

  // No opportunities yet
  const r1 = await api("GET", `${OBASE}/mine`, { cookie });
  assert(r1.status === 200 && Array.isArray(r1.json?.data), "empty list returns 200 with array");

  // Create two
  await api("POST", OBASE, { body: { title: "Opp1" }, cookie });
  await api("POST", OBASE, { body: { title: "Opp2" }, cookie });
  const r2 = await api("GET", `${OBASE}/mine`, { cookie });
  assert(r2.status === 200 && r2.json?.data?.length >= 2, "list returns created opportunities");

  // No startup — still 200 with empty array
  const { cookie: c2 } = seedUser("Founder ListNS", "flistns@test.com", "founder");
  const r3 = await api("GET", `${OBASE}/mine`, { cookie: c2 });
  assert(r3.status === 200 && r3.json?.data?.length === 0, "no startup returns 200 empty array");
}

async function testUpdate() {
  console.log("\n[4] PATCH /:id — update");

  const { cookie, userId } = seedUser("Founder Upd", "fupd@test.com", "founder");
  seedStartup(userId);

  const created = await api("POST", OBASE, { body: { title: "Draft A" }, cookie });
  const oppId = created.json?.data?.id;

  // Valid partial update
  const r1 = await api("PATCH", `${OBASE}/${oppId}`, { body: { title: "Updated Title" }, cookie });
  assert(r1.status === 200, "valid update returns 200");
  assert(r1.json?.data?.title === "Updated Title", "title updated");

  // Empty body → 400
  const r2 = await api("PATCH", `${OBASE}/${oppId}`, { body: {}, cookie });
  assert(r2.status === 400, "empty update body returns 400");

  // Unknown field → 400
  const r3 = await api("PATCH", `${OBASE}/${oppId}`, { body: { startup: "x" }, cookie });
  assert(r3.status === 400, "startup in update body rejected");

  const r4 = await api("PATCH", `${OBASE}/${oppId}`, { body: { status: "approved" }, cookie });
  assert(r4.status === 400, "status in update body rejected");

  // Invalid ID → 400
  const r5 = await api("PATCH", `${OBASE}/not-an-id`, { body: { title: "X" }, cookie });
  assert(r5.status === 400, "invalid id returns 400");

  // Not found → 404
  const r6 = await api("PATCH", `${OBASE}/${new mongoose.Types.ObjectId()}`, { body: { title: "X" }, cookie });
  assert(r6.status === 404, "missing opportunity returns 404");

  // Another founder cannot update
  const { cookie: c2, userId: u2 } = seedUser("Founder Other", "fother@test.com", "founder");
  seedStartup(u2);
  const r7 = await api("PATCH", `${OBASE}/${oppId}`, { body: { title: "Stolen" }, cookie: c2 });
  assert(r7.status === 404, "other founder cannot update (404, not 403)");
}

async function testSubmit() {
  console.log("\n[5] POST /:id/submit");

  const { cookie, userId } = seedUser("Founder Sub", "fsub@test.com", "founder");
  const startup = seedStartup(userId);

  // Incomplete draft — missing all optional fields
  const created1 = await api("POST", OBASE, { body: { title: "Incomplete" }, cookie });
  const id1 = created1.json?.data?.id;

  const r1 = await api("POST", `${OBASE}/${id1}/submit`, { cookie });
  assert(r1.status === 400, "incomplete draft submit returns 400");
  assert(r1.json?.error?.code === "VALIDATION_ERROR", "returns VALIDATION_ERROR");
  assert(Array.isArray(r1.json?.error?.details), "details array present");
  const missingFields = r1.json?.error?.details?.map((d) => d.field);
  assert(
    ["stage", "fundingRequired", "description", "useOfFunds"].every((f) => missingFields.includes(f)),
    "all missing fields listed"
  );

  // Complete draft — submit succeeds
  const created2 = await api("POST", OBASE, {
    body: { title: "Complete", stage: "seed", fundingRequired: 10000000, description: "D", useOfFunds: "U" },
    cookie,
  });
  const id2 = created2.json?.data?.id;

  const r2 = await api("POST", `${OBASE}/${id2}/submit`, { cookie });
  assert(r2.status === 200, "complete draft submit returns 200");
  assert(r2.json?.data?.status === "pending_review", "status is pending_review after submit");
  assert(r2.json?.data?.submittedAt !== null, "submittedAt is set");

  // Snapshot generated from startup (not from client)
  const snap = r2.json?.data?.startupSnapshot;
  assert(snap !== null, "startupSnapshot is present");
  assert(snap?.name === "AcmeCorp" && snap?.industry === "fintech", "snapshot contains startup data");
  assert(!snap?.hasOwnProperty("_id"), "snapshot has no _id");

  // Audit log entry created
  assert(auditStore.some((a) => a.action === "opportunity.submitted" && a.resourceId.toString() === id2), "audit log written for submission");

  // Cannot submit again (pending_review → conflict)
  const r3 = await api("POST", `${OBASE}/${id2}/submit`, { cookie });
  assert(r3.status === 409, "re-submit of pending_review returns 409");

  // Invalid ID
  const r4 = await api("POST", `${OBASE}/not-an-id/submit`, { cookie });
  assert(r4.status === 400, "invalid id on submit returns 400");
}

async function testTerminalStates() {
  console.log("\n[6] Terminal and locked states");

  const { cookie, userId } = seedUser("Founder Term", "fterm@test.com", "founder");
  seedStartup(userId);

  // Create and submit an opportunity
  const cr = await api("POST", OBASE, {
    body: { title: "Terminal", stage: "seed", fundingRequired: 1000000, description: "D", useOfFunds: "U" },
    cookie,
  });
  const oppId = cr.json?.data?.id;
  await api("POST", `${OBASE}/${oppId}/submit`, { cookie });

  // Pending cannot be edited
  const r1 = await api("PATCH", `${OBASE}/${oppId}`, { body: { title: "X" }, cookie });
  assert(r1.status === 409, "pending_review opportunity cannot be edited");

  // Simulate admin approval by directly mutating store
  const opp = oppStore.get(oppId);
  oppStore.set(oppId, { ...opp, status: "approved", publishedAt: new Date() });

  // Approved cannot be submitted or edited
  const r2 = await api("POST", `${OBASE}/${oppId}/submit`, { cookie });
  assert(r2.status === 409, "approved opportunity cannot be submitted");

  const r3 = await api("PATCH", `${OBASE}/${oppId}`, { body: { title: "Y" }, cookie });
  assert(r3.status === 409, "approved opportunity cannot be edited");

  // Simulate rejection
  oppStore.set(oppId, { ...opp, status: "rejected" });

  const r4 = await api("POST", `${OBASE}/${oppId}/submit`, { cookie });
  assert(r4.status === 409, "rejected opportunity cannot be submitted");
}

async function testChangesRequestedFlow() {
  console.log("\n[7] changes_requested → resubmit flow");

  const { cookie, userId } = seedUser("Founder CR", "fcr@test.com", "founder");
  seedStartup(userId);

  const cr = await api("POST", OBASE, {
    body: { title: "Changes", stage: "seed", fundingRequired: 2000000, description: "D", useOfFunds: "U" },
    cookie,
  });
  const oppId = cr.json?.data?.id;

  // Simulate admin requesting changes
  oppStore.set(oppId, {
    ...oppStore.get(oppId),
    status: "changes_requested",
    reviewNote: "Please add more details",
  });

  // Editable again
  const r1 = await api("PATCH", `${OBASE}/${oppId}`, { body: { description: "Updated desc" }, cookie });
  assert(r1.status === 200, "changes_requested opportunity can be edited");

  // Can be resubmitted
  const r2 = await api("POST", `${OBASE}/${oppId}/submit`, { cookie });
  assert(r2.status === 200, "changes_requested opportunity can be resubmitted");
  assert(r2.json?.data?.status === "pending_review", "status moves to pending_review");

  // Audit log contains resubmission
  assert(
    auditStore.some((a) => a.action === "opportunity.resubmitted"),
    "audit log written for resubmission"
  );
}

async function testAdminList() {
  console.log("\n[8] Admin list");

  const { cookie } = seedUser("Admin A", "admin@test.com", "admin");

  // Default status filter = pending_review
  const r1 = await api("GET", ABASE, { cookie });
  assert(r1.status === 200, "admin list returns 200");
  assert(Array.isArray(r1.json?.data), "data is array");
  assert(r1.json?.pagination !== undefined, "pagination present");

  // Draft status is excluded — admins should only manage submitted/reviewed listings
  const r2 = await api("GET", `${ABASE}?status=draft`, { cookie });
  assert(r2.status === 400, "admin list with status=draft returns 400 (draft excluded from admin)");

  // Invalid status
  const r3 = await api("GET", `${ABASE}?status=invalid`, { cookie });
  assert(r3.status === 400, "invalid status filter returns 400");

  // Unknown query param
  const r4 = await api("GET", `${ABASE}?hack=1`, { cookie });
  assert(r4.status === 400, "unknown query param returns 400");
}

async function testAdminGet() {
  console.log("\n[9] Admin get by ID");

  const { cookie } = seedUser("Admin B", "adminb@test.com", "admin");

  // Seed a pending opp
  const { userId: fu } = seedUser("Founder AG", "fag@test.com", "founder");
  const st = seedStartup(fu);
  const oppDoc = {
    _id: makeId(), startup: st._id, title: "Admin View",
    status: "pending_review", stage: "seed", fundingRequired: 1000000,
    description: "D", useOfFunds: "U",
    createdAt: new Date(), updatedAt: new Date(),
  };
  oppStore.set(oppDoc._id.toString(), oppDoc);

  const r1 = await api("GET", `${ABASE}/${oppDoc._id}`, { cookie });
  assert(r1.status === 200, "admin get by id returns 200");
  assert(r1.json?.data?.id === oppDoc._id.toString(), "correct opportunity returned");

  // Draft opportunity is hidden from admin (same as 404)
  const draftDoc = {
    _id: makeId(), startup: st._id, title: "Draft Hidden",
    status: "draft", stage: "seed", fundingRequired: 1000000,
    description: "D", useOfFunds: "U",
    createdAt: new Date(), updatedAt: new Date(),
  };
  oppStore.set(draftDoc._id.toString(), draftDoc);
  const rDraft = await api("GET", `${ABASE}/${draftDoc._id}`, { cookie });
  assert(rDraft.status === 404, "admin get by id returns 404 for draft opportunity");

  // Not found
  const r2 = await api("GET", `${ABASE}/${new mongoose.Types.ObjectId()}`, { cookie });
  assert(r2.status === 404, "missing opportunity returns 404");

  // Invalid ID
  const r3 = await api("GET", `${ABASE}/bad-id`, { cookie });
  assert(r3.status === 400, "invalid id returns 400");
}

async function testAdminReview() {
  console.log("\n[10] Admin review decisions");

  const { cookie } = seedUser("Admin Rev", "adminrev@test.com", "admin");
  const { userId: fu } = seedUser("Founder Rev", "frev@test.com", "founder");
  const st = seedStartup(fu);

  function mkOpp(title) {
    const doc = {
      _id: makeId(), startup: st._id, title,
      status: "pending_review", stage: "seed",
      fundingRequired: 1000000, description: "D", useOfFunds: "U",
      createdAt: new Date(), updatedAt: new Date(),
    };
    oppStore.set(doc._id.toString(), doc);
    return doc;
  }

  // Approve
  const opp1 = mkOpp("Approve Me");
  const r1 = await api("PATCH", `${ABASE}/${opp1._id}/review`, {
    body: { decision: "approved" },
    cookie,
  });
  assert(r1.status === 200, "approve returns 200");
  assert(r1.json?.data?.status === "approved", "status is approved");
  assert(r1.json?.data?.publishedAt !== null, "publishedAt set on approve");
  assert(r1.json?.data?.reviewedBy !== null, "reviewedBy set");

  // Reject with note
  const opp2 = mkOpp("Reject Me");
  const r2 = await api("PATCH", `${ABASE}/${opp2._id}/review`, {
    body: { decision: "rejected", reviewNote: "Not viable" },
    cookie,
  });
  assert(r2.status === 200, "reject returns 200");
  assert(r2.json?.data?.status === "rejected", "status is rejected");

  // Changes requested with note
  const opp3 = mkOpp("Change Me");
  const r3 = await api("PATCH", `${ABASE}/${opp3._id}/review`, {
    body: { decision: "changes_requested", reviewNote: "Need more detail" },
    cookie,
  });
  assert(r3.status === 200, "changes_requested returns 200");
  assert(r3.json?.data?.status === "changes_requested", "status is changes_requested");

  // Audit log entries
  assert(auditStore.some((a) => a.action === "opportunity.approved"), "audit: approved");
  assert(auditStore.some((a) => a.action === "opportunity.rejected"), "audit: rejected");
  assert(auditStore.some((a) => a.action === "opportunity.changes_requested"), "audit: changes_requested");

  // Review note required for rejected
  const opp4 = mkOpp("No Note Rejected");
  const r4 = await api("PATCH", `${ABASE}/${opp4._id}/review`, {
    body: { decision: "rejected" },
    cookie,
  });
  assert(r4.status === 400, "rejected without reviewNote returns 400");

  // Review note required for changes_requested
  const opp5 = mkOpp("No Note Changes");
  const r5 = await api("PATCH", `${ABASE}/${opp5._id}/review`, {
    body: { decision: "changes_requested" },
    cookie,
  });
  assert(r5.status === 400, "changes_requested without reviewNote returns 400");

  // Approved without note is fine
  const opp6 = mkOpp("Approve No Note");
  const r6 = await api("PATCH", `${ABASE}/${opp6._id}/review`, {
    body: { decision: "approved" },
    cookie,
  });
  assert(r6.status === 200, "approved without reviewNote is fine");

  // Unknown field in review body
  const opp7 = mkOpp("Extra Field");
  const r7 = await api("PATCH", `${ABASE}/${opp7._id}/review`, {
    body: { decision: "approved", extra: "hack" },
    cookie,
  });
  assert(r7.status === 400, "extra field in review body rejected");

  // Missing decision
  const opp8 = mkOpp("No Decision");
  const r8 = await api("PATCH", `${ABASE}/${opp8._id}/review`, {
    body: {},
    cookie,
  });
  assert(r8.status === 400, "missing decision returns 400");
}

async function testReviewOnNonPending() {
  console.log("\n[11] Review on non-pending opportunities");

  const { cookie } = seedUser("Admin NP", "adminnp@test.com", "admin");
  const { userId: fu } = seedUser("Founder NP", "fnp@test.com", "founder");
  const st = seedStartup(fu);

  function mkOpp(status) {
    const doc = {
      _id: makeId(), startup: st._id, title: "T", status,
      stage: "seed", fundingRequired: 1, description: "D", useOfFunds: "U",
      createdAt: new Date(), updatedAt: new Date(),
    };
    oppStore.set(doc._id.toString(), doc);
    return doc;
  }

  for (const status of ["draft", "changes_requested", "approved", "rejected"]) {
    const opp = mkOpp(status);
    const r = await api("PATCH", `${ABASE}/${opp._id}/review`, {
      body: { decision: "approved" },
      cookie,
    });
    assert(r.status === 409, `review on '${status}' returns 409`);
  }
}

async function testRoleRestrictions() {
  console.log("\n[12] Role restrictions");

  const { cookie: invCookie } = seedUser("Investor Z", "invz@test.com", "investor");
  const { cookie: adminCookie } = seedUser("Admin Z", "adminz@test.com", "admin");
  const { cookie: founderCookie, userId } = seedUser("Founder Z", "fz@test.com", "founder");
  seedStartup(userId);

  const body = { title: "T" };

  // Investor cannot use founder endpoints
  const r1 = await api("POST", OBASE, { body, cookie: invCookie });
  assert(r1.status === 403, "investor cannot create opportunity");

  const r2 = await api("GET", `${OBASE}/mine`, { cookie: invCookie });
  assert(r2.status === 403, "investor cannot list own opportunities");

  // Admin cannot use founder endpoints
  const r3 = await api("POST", OBASE, { body, cookie: adminCookie });
  assert(r3.status === 403, "admin cannot create opportunity");

  // Founder cannot use admin endpoints
  const r4 = await api("GET", ABASE, { cookie: founderCookie });
  assert(r4.status === 403, "founder cannot access admin list");

  // No cookie → 401 on all
  const r5 = await api("POST", OBASE, { body });
  assert(r5.status === 401, "no cookie on founder endpoint returns 401");

  const r6 = await api("GET", ABASE);
  assert(r6.status === 401, "no cookie on admin endpoint returns 401");
}

async function testConcurrentConflict() {
  console.log("\n[13] Concurrent state conflict");

  const { cookie, userId } = seedUser("Founder Conc", "fconc@test.com", "founder");
  seedStartup(userId);

  const cr = await api("POST", OBASE, {
    body: { title: "Concurrent", stage: "seed", fundingRequired: 1, description: "D", useOfFunds: "U" },
    cookie,
  });
  const oppId = cr.json?.data?.id;

  // Submit successfully
  await api("POST", `${OBASE}/${oppId}/submit`, { cookie });

  // Now simulate concurrent: another process already moved it to approved
  oppStore.set(oppId, { ...oppStore.get(oppId), status: "approved" });

  // A stale submit should now get 409
  const r1 = await api("POST", `${OBASE}/${oppId}/submit`, { cookie });
  assert(r1.status === 409, "stale submit returns 409 conflict");

  // Admin review on already-reviewed opp (simulated concurrent)
  const { cookie: adminCookie } = seedUser("Admin Conc", "adminconc@test.com", "admin");
  const oppDoc = {
    _id: makeId(), title: "Conc2", status: "pending_review",
    startup: makeId(), stage: "seed", fundingRequired: 1,
    description: "D", useOfFunds: "U",
    createdAt: new Date(), updatedAt: new Date(),
  };
  oppStore.set(oppDoc._id.toString(), oppDoc);

  // First review succeeds
  await api("PATCH", `${ABASE}/${oppDoc._id}/review`, {
    body: { decision: "approved" },
    cookie: adminCookie,
  });
  // Second review on now-approved opp returns 409
  const r2 = await api("PATCH", `${ABASE}/${oppDoc._id}/review`, {
    body: { decision: "rejected", reviewNote: "Changed mind" },
    cookie: adminCookie,
  });
  assert(r2.status === 409, "concurrent admin review returns 409");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await startServer();
  try {
    await testDraftCreation();
    await testValidationOnCreate();
    await testListMine();
    await testUpdate();
    await testSubmit();
    await testTerminalStates();
    await testChangesRequestedFlow();
    await testAdminList();
    await testAdminGet();
    await testAdminReview();
    await testReviewOnNonPending();
    await testRoleRestrictions();
    await testConcurrentConflict();
  } finally {
    await stopServer();
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Opportunity smoke test: ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => { console.error("Unexpected error:", err); process.exitCode = 1; });
