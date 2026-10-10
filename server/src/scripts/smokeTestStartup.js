"use strict";

/**
 * Offline smoke test for VentureDesk Phase 3 — Startup Profile.
 * No real DB connection. Startup and User model calls are stubbed in memory.
 * Uses Node's built-in fetch (Node >=18).
 *
 * Run: node src/scripts/smokeTestStartup.js
 */

const http = require("http");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// ── In-memory stores ──────────────────────────────────────────────────────────
const userStore = new Map();   // email → user doc
const startupStore = new Map(); // ownerId (string) → startup doc

function makeId() { return new mongoose.Types.ObjectId(); }

// ── Stub User model ────────────────────────────────────────────────────────────
const User = require("../models/User");

function userChain(email) {
  let includeHash = false;
  const chain = {
    select(f) { if (f && f.includes("+passwordHash")) includeHash = true; return chain; },
    lean() {
      const doc = userStore.get(email);
      if (!doc) return Promise.resolve(null);
      const r = { ...doc };
      if (!includeHash) delete r.passwordHash;
      return Promise.resolve(r);
    },
    then(res, rej) { return chain.lean().then(res, rej); },
  };
  return chain;
}

User.findOne = (q) => userChain(q.email);
User.create  = async (d) => {
  if (userStore.has(d.email)) { const e = new Error("dup"); e.code = 11000; throw e; }
  const doc = { _id: makeId(), fullName: d.fullName, email: d.email, passwordHash: d.passwordHash, role: d.role, createdAt: new Date(), updatedAt: new Date() };
  userStore.set(d.email, doc);
  return doc;
};
User.findById = async (id) => {
  for (const doc of userStore.values()) {
    if (doc._id.toString() === id.toString()) {
      const { passwordHash: _, ...pub } = doc;
      return pub;
    }
  }
  return null;
};

// ── Stub Startup model ─────────────────────────────────────────────────────────
const Startup = require("../models/Startup");

Startup.create = async (data) => {
  const ownerId = data.owner.toString();
  if (startupStore.has(ownerId)) {
    const e = new Error("E11000 duplicate key error"); e.code = 11000; throw e;
  }
  const doc = {
    _id: makeId(),
    owner: data.owner,
    name: data.name,
    description: data.description,
    industry: data.industry,
    location: data.location,
    website: data.website ?? undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  startupStore.set(ownerId, doc);
  return doc;
};

Startup.findOne = (q) => {
  const ownerId = q.owner?.toString();
  const lean = () => {
    const doc = ownerId ? startupStore.get(ownerId) ?? null : null;
    return Promise.resolve(doc);
  };
  return { lean };
};

Startup.findOneAndUpdate = async (filter, update, opts) => {
  const ownerId = filter.owner?.toString();
  const doc = startupStore.get(ownerId);
  if (!doc) return null;
  const delta = update.$set ?? {};
  const updated = { ...doc, ...delta, updatedAt: new Date() };
  startupStore.set(ownerId, updated);
  return updated;
};

// ── Bootstrap app ─────────────────────────────────────────────────────────────
process.env.JWT_SECRET   = "a-sufficiently-long-secret-for-testing-32chars!!";
process.env.JWT_EXPIRES_IN = "2h";
process.env.NODE_ENV     = "test";

const app    = require("../app");
const { protect, authorize } = require("../middleware/authMiddleware");

// Splice test route before the 404 handler (same pattern as auth smoke test)
(function () {
  const testRouter = require("express").Router();
  testRouter.get("/api/__test_investor_only__", protect, authorize("investor"), (req, res) =>
    res.status(200).json({ ok: true })
  );
  const stack = app.router.stack;
  stack.splice(stack.length - 2, 0, ...testRouter.stack);
})();

let server, BASE, AUTHBASE;

async function startServer() {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      BASE     = `http://127.0.0.1:${port}/api/startups`;
      AUTHBASE = `http://127.0.0.1:${port}/api/auth`;
      resolve();
    });
  });
}
async function stopServer() { await new Promise((r) => server.close(r)); }

// ── Helpers ────────────────────────────────────────────────────────────────────
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
  return { status: res.status, json, setCookie: res.headers.get("set-cookie") || "" };
}

async function registerAndLogin(fullName, email, role) {
  const hash = await bcrypt.hash("password123", 10);
  // Directly seed user into the store
  const doc = { _id: makeId(), fullName, email, passwordHash: hash, role, createdAt: new Date(), updatedAt: new Date() };
  userStore.set(email, doc);
  // Mint JWT directly to avoid consuming rate-limit slots on /api/auth/login
  const jwt = require("jsonwebtoken");
  const token = jwt.sign({ sub: doc._id.toString() }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "2h" });
  return { token, userId: doc._id.toString() };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testCreate() {
  console.log("\n[1] POST /api/startups — create");

  const { token } = await registerAndLogin("Founder One", "founder1@test.com", "founder");
  const cookie = `venturedesk_token=${token}`;

  const validBody = {
    name: "AgroTech Solutions",
    description: "Precision farming using satellite data",
    industry: "agritech",
    location: "Hyderabad",
  };

  // Valid create → 201 with public fields
  const r1 = await api("POST", BASE, { body: validBody, cookie });
  assert(r1.status === 201, "valid create returns 201");
  const d = r1.json?.data;
  assert(d?.id && d?.owner && d?.name && d?.description && d?.industry && d?.location && d?.createdAt, "response has public fields");
  assert(d?.website === null, "website is null when not provided");

  // owner in response must match authenticated user, not be injectable
  const { userId } = await registerAndLogin("Founder Two", "founder2@test.com", "founder");
  assert(d.owner !== userId, "owner matches session user, not another user");

  // Create with valid optional website
  startupStore.clear(); // reset so founder1 can create again
  const { token: t2 } = await registerAndLogin("Founder Three", "founder3@test.com", "founder");
  const r2 = await api("POST", BASE, {
    body: { ...validBody, website: "https://agrotech.io" },
    cookie: `venturedesk_token=${t2}`,
  });
  assert(r2.status === 201, "create with valid website returns 201");
  assert(r2.json?.data?.website === "https://agrotech.io", "website stored correctly");

  // Duplicate create → 409
  const r3 = await api("POST", BASE, { body: validBody, cookie: `venturedesk_token=${t2}` });
  assert(r3.status === 409, "duplicate create returns 409");
  assert(r3.json?.error?.code === "CONFLICT", "duplicate returns CONFLICT code");
}

async function testValidationOnCreate() {
  console.log("\n[2] POST /api/startups — validation");

  const { token } = await registerAndLogin("Founder Val", "founderval@test.com", "founder");
  const cookie = `venturedesk_token=${token}`;

  const base = { name: "Test", description: "Desc", industry: "fintech", location: "Delhi" };

  // Missing required field
  const r1 = await api("POST", BASE, { body: { ...base, name: undefined }, cookie });
  assert(r1.status === 400, "missing name returns 400");
  assert(r1.json?.error?.code === "VALIDATION_ERROR", "missing name returns VALIDATION_ERROR");

  // Invalid industry
  const r2 = await api("POST", BASE, { body: { ...base, industry: "crypto" }, cookie });
  assert(r2.status === 400, "invalid industry returns 400");

  // Invalid website
  const r3 = await api("POST", BASE, { body: { ...base, website: "ftp://bad.com" }, cookie });
  assert(r3.status === 400, "ftp website returns 400");

  // Non-http/https website
  const r4 = await api("POST", BASE, { body: { ...base, website: "not-a-url" }, cookie });
  assert(r4.status === 400, "non-url website returns 400");

  // Unknown field (strict mode)
  const r5 = await api("POST", BASE, { body: { ...base, owner: "hacked-id" }, cookie });
  assert(r5.status === 400, "owner in body rejected by strict schema");

  const r6 = await api("POST", BASE, { body: { ...base, extra: "hack" }, cookie });
  assert(r6.status === 400, "extra field rejected by strict schema");
}

async function testRead() {
  console.log("\n[3] GET /api/startups/me — read");

  // Set up a fresh founder with a startup
  const { token } = await registerAndLogin("Founder Read", "founderread@test.com", "founder");
  const cookie = `venturedesk_token=${token}`;
  await api("POST", BASE, {
    body: { name: "ReadCo", description: "A company", industry: "saas", location: "Pune" },
    cookie,
  });

  // GET me → 200 with correct data
  const r1 = await api("GET", `${BASE}/me`, { cookie });
  assert(r1.status === 200, "GET /me returns 200");
  assert(r1.json?.data?.name === "ReadCo", "returns correct startup name");

  // No passwordHash or _id leak
  const body = JSON.stringify(r1.json);
  assert(!body.includes("passwordHash"), "no passwordHash in response");
  assert(!body.includes('"__v"'), "no __v in response");

  // No startup yet (fresh founder)
  const { token: t2 } = await registerAndLogin("Founder Empty", "founderempty@test.com", "founder");
  const r2 = await api("GET", `${BASE}/me`, { cookie: `venturedesk_token=${t2}` });
  assert(r2.status === 404, "founder with no startup gets 404");
}

async function testUpdate() {
  console.log("\n[4] PATCH /api/startups/me — update");

  const { token } = await registerAndLogin("Founder Upd", "founderupd@test.com", "founder");
  const cookie = `venturedesk_token=${token}`;
  await api("POST", BASE, {
    body: { name: "OldName", description: "Old desc", industry: "edtech", location: "Mumbai" },
    cookie,
  });

  // Valid partial update
  const r1 = await api("PATCH", `${BASE}/me`, { body: { name: "NewName" }, cookie });
  assert(r1.status === 200, "valid partial update returns 200");
  assert(r1.json?.data?.name === "NewName", "name updated correctly");

  // Update industry only
  const r2 = await api("PATCH", `${BASE}/me`, { body: { industry: "fintech" }, cookie });
  assert(r2.status === 200, "update industry only returns 200");
  assert(r2.json?.data?.industry === "fintech", "industry updated correctly");

  // Update website
  const r3 = await api("PATCH", `${BASE}/me`, { body: { website: "https://new.io" }, cookie });
  assert(r3.status === 200, "update website returns 200");
  assert(r3.json?.data?.website === "https://new.io", "website updated correctly");

  // Empty update body → 400
  const r4 = await api("PATCH", `${BASE}/me`, { body: {}, cookie });
  assert(r4.status === 400, "empty update body returns 400");

  // Unknown field in update → 400
  const r5 = await api("PATCH", `${BASE}/me`, { body: { owner: "hacked" }, cookie });
  assert(r5.status === 400, "owner in update body rejected");

  const r6 = await api("PATCH", `${BASE}/me`, { body: { extra: "x" }, cookie });
  assert(r6.status === 400, "extra field in update rejected");

  // Invalid industry in update
  const r7 = await api("PATCH", `${BASE}/me`, { body: { industry: "blockchain" }, cookie });
  assert(r7.status === 400, "invalid industry in update returns 400");

  // Update when no startup exists → 404
  const { token: t2 } = await registerAndLogin("Founder NoStartup", "foundernone@test.com", "founder");
  const r8 = await api("PATCH", `${BASE}/me`, { body: { name: "X" }, cookie: `venturedesk_token=${t2}` });
  assert(r8.status === 404, "update with no startup returns 404");
}

async function testAuth() {
  console.log("\n[5] Authentication and role checks");

  const validBody = { name: "X", description: "Y", industry: "saas", location: "Z" };

  // No cookie → 401
  const r1 = await api("POST", BASE, { body: validBody });
  assert(r1.status === 401, "create without cookie returns 401");

  const r2 = await api("GET", `${BASE}/me`);
  assert(r2.status === 401, "read without cookie returns 401");

  const r3 = await api("PATCH", `${BASE}/me`, { body: { name: "X" } });
  assert(r3.status === 401, "update without cookie returns 401");

  // Investor role → 403
  const { token: invToken } = await registerAndLogin("Investor One", "investor1@test.com", "investor");
  const invCookie = `venturedesk_token=${invToken}`;

  const r4 = await api("POST", BASE, { body: validBody, cookie: invCookie });
  assert(r4.status === 403, "investor create returns 403");

  const r5 = await api("GET", `${BASE}/me`, { cookie: invCookie });
  assert(r5.status === 403, "investor read returns 403");

  const r6 = await api("PATCH", `${BASE}/me`, { body: { name: "X" }, cookie: invCookie });
  assert(r6.status === 403, "investor update returns 403");
}

async function testOwnerTampering() {
  console.log("\n[6] Owner tampering prevention");

  const { token: t1, userId: id1 } = await registerAndLogin("Founder A", "foundA@test.com", "founder");
  const { token: t2, userId: id2 } = await registerAndLogin("Founder B", "foundB@test.com", "founder");

  // Create startup for founder A
  await api("POST", BASE, {
    body: { name: "FounderACo", description: "D", industry: "saas", location: "L" },
    cookie: `venturedesk_token=${t1}`,
  });

  // Founder B sends owner: id1 in body — should be rejected as unknown field
  const r1 = await api("POST", BASE, {
    body: { name: "Hack", description: "D", industry: "fintech", location: "L", owner: id1 },
    cookie: `venturedesk_token=${t2}`,
  });
  if (r1.status !== 400) console.error("    DEBUG r1:", r1.status, JSON.stringify(r1.json?.error));
  assert(r1.status === 400, "owner field in create body is rejected");

  // Founder B creates legitimately, then tries to patch with owner: id1
  await api("POST", BASE, {
    body: { name: "FounderBCo", description: "D", industry: "fintech", location: "L" },
    cookie: `venturedesk_token=${t2}`,
  });
  const r2 = await api("PATCH", `${BASE}/me`, {
    body: { owner: id1 },
    cookie: `venturedesk_token=${t2}`,
  });
  if (r2.status !== 400) console.error("    DEBUG r2:", r2.status, JSON.stringify(r2.json?.error));
  assert(r2.status === 400, "owner field in update body is rejected");

  // GET /me for founder B only returns their own startup
  const r3 = await api("GET", `${BASE}/me`, { cookie: `venturedesk_token=${t2}` });
  if (!(r3.status === 200 && r3.json?.data?.name === "FounderBCo")) console.error("    DEBUG r3:", r3.status, JSON.stringify(r3.json?.data));
  assert(r3.status === 200 && r3.json?.data?.name === "FounderBCo", "GET /me returns own startup, not another founder's");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await startServer();
  try {
    await testCreate();
    await testValidationOnCreate();
    await testRead();
    await testUpdate();
    await testAuth();
    await testOwnerTampering();
  } finally {
    await stopServer();
  }
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Startup smoke test: ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => { console.error("Unexpected error:", err); process.exitCode = 1; });
