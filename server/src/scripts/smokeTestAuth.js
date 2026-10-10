"use strict";

/**
 * Offline smoke test for VentureDesk Phase 2 — Auth.
 * No real DB connection. User model calls are stubbed in memory.
 * Uses Node's built-in fetch (Node >=18).
 *
 * Run: node src/scripts/smokeTestAuth.js
 */

const http = require("http");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// ── In-memory user store ───────────────────────────────────────────────────────
const store = new Map(); // email → user doc

function makeId() {
  return new mongoose.Types.ObjectId();
}

// ── Stub User model BEFORE requiring app (which requires models) ───────────────
const User = require("../models/User");

/**
 * Build a query chainable that supports .select(fields).lean() or just .lean().
 * The value is resolved when .lean() is called, or via .then() if awaited directly.
 */
function buildChain(email) {
  let includeHash = false;

  const chain = {
    select(fields) {
      if (typeof fields === "string" && fields.includes("+passwordHash")) {
        includeHash = true;
      }
      return chain;
    },
    lean() {
      const doc = store.get(email);
      if (!doc) return Promise.resolve(null);
      const result = { ...doc };
      if (!includeHash) delete result.passwordHash;
      return Promise.resolve(result);
    },
    then(resolve, reject) {
      // Allows `await User.findOne(...)` without explicit .lean()
      return chain.lean().then(resolve, reject);
    },
  };

  return chain;
}

User.findOne = function ({ email } = {}) {
  return buildChain(email);
};

User.create = async function (data) {
  if (store.has(data.email)) {
    const err = new Error("E11000 duplicate key");
    err.code = 11000;
    throw err;
  }
  const doc = {
    _id: makeId(),
    fullName: data.fullName,
    email: data.email,
    passwordHash: data.passwordHash,
    role: data.role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  store.set(data.email, doc);
  return doc;
};

User.findById = async function (id) {
  for (const doc of store.values()) {
    if (doc._id.toString() === id.toString()) {
      const { passwordHash: _, ...pub } = doc;
      return pub;
    }
  }
  return null;
};

// ── Load app & start server ───────────────────────────────────────────────────
process.env.JWT_SECRET = "a-sufficiently-long-secret-for-testing-32chars!!";
process.env.JWT_EXPIRES_IN = "2h";
process.env.NODE_ENV = "test";

const app = require("../app");
const { authorize, protect } = require("../middleware/authMiddleware");

// Register the throwaway authorize test route by splicing it into the router
// stack BEFORE the 404 handler (which is the last layer Express registered).
// This is test-only; never do this in production code.
(function registerTestRoute() {
  const testRouter = require("express").Router();
  testRouter.get(
    "/api/__test_founder_only__",
    protect,
    authorize("founder"),
    (req, res) => res.status(200).json({ ok: true })
  );

  // Splice the test router's layer(s) before the last two layers (404 + error handler)
  const stack = app.router.stack;
  const testLayers = testRouter.stack;
  // Insert before the 404 handler; it is the last non-error handler
  const insertAt = stack.length - 2; // before 404 and error handler
  stack.splice(insertAt, 0, ...testLayers);
})();

let server;
let BASE;

async function startServer() {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      BASE = `http://127.0.0.1:${port}/api/auth`;
      resolve();
    });
  });
}

async function stopServer() {
  await new Promise((resolve) => server.close(resolve));
}

// ── Test helpers ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
  }
}

async function req(method, path, { body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json;
  try { json = await res.json(); } catch { json = null; }
  const setCookie = res.headers.get("set-cookie") || "";
  return { status: res.status, json, setCookie };
}

/** Extract the raw token value from a Set-Cookie string. Returns null if absent. */
function extractCookieValue(setCookie) {
  const m = setCookie.match(/venturedesk_token=([^;]+)/);
  return m ? m[1] : null;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testRegister() {
  console.log("\n[1] Register");

  // Valid founder
  const r1 = await req("POST", "/register", { body: { fullName: "Alice Founder", email: "alice@example.com", password: "password123", role: "founder" } });
  assert(r1.status === 201, "valid founder returns 201");
  const d1 = r1.json?.data;
  assert(d1?.id && d1?.fullName && d1?.email && d1?.role && d1?.createdAt, "response has public fields");
  assert(!("passwordHash" in (d1 ?? {})) && !("password" in (d1 ?? {})), "no password/hash in response");

  // Valid investor
  const r2 = await req("POST", "/register", { body: { fullName: "Bob Investor", email: "bob@example.com", password: "password123", role: "investor" } });
  assert(r2.status === 201, "valid investor returns 201");

  // Admin role rejected
  const r3 = await req("POST", "/register", { body: { fullName: "Carl Admin", email: "carl@example.com", password: "password123", role: "admin" } });
  assert(r3.status === 400, "admin role returns 400");
  assert(r3.json?.error?.code === "VALIDATION_ERROR", "admin role returns VALIDATION_ERROR code");

  // Extra field rejected (.strict())
  const r4 = await req("POST", "/register", { body: { fullName: "Dave", email: "dave@example.com", password: "password123", role: "founder", extra: "hack" } });
  assert(r4.status === 400, "extra field returns 400");

  // Short password
  const r5 = await req("POST", "/register", { body: { fullName: "Eve", email: "eve@example.com", password: "short", role: "founder" } });
  assert(r5.status === 400, "short password returns 400");

  // Password over 72 characters
  const r6 = await req("POST", "/register", { body: { fullName: "Frank", email: "frank@example.com", password: "a".repeat(73), role: "founder" } });
  assert(r6.status === 400, "password > 72 chars returns 400");

  // Bad email
  const r7 = await req("POST", "/register", { body: { fullName: "Grace", email: "not-an-email", password: "password123", role: "founder" } });
  assert(r7.status === 400, "bad email returns 400");

  // Email is lowercased
  const r8 = await req("POST", "/register", { body: { fullName: "Hank", email: "HANK@EXAMPLE.COM", password: "password123", role: "investor" } });
  assert(r8.status === 201, "uppercased email accepted");
  assert(r8.json?.data?.email === "hank@example.com", "email stored as lowercase");

  // Stored value is a bcrypt hash
  const hankDoc = store.get("hank@example.com");
  assert(hankDoc?.passwordHash?.startsWith("$2"), "stored value is bcrypt hash");

  // Duplicate email returns 409
  const r9 = await req("POST", "/register", { body: { fullName: "Alice Again", email: "alice@example.com", password: "password123", role: "founder" } });
  assert(r9.status === 409, "duplicate email returns 409");

  // Simulated Mongo 11000
  const origCreate = User.create;
  User.create = async () => { const e = new Error("E11000"); e.code = 11000; throw e; };
  const r10 = await req("POST", "/register", { body: { fullName: "Dup", email: "dup@example.com", password: "password123", role: "founder" } });
  assert(r10.status === 409, "simulated 11000 returns 409");
  User.create = origCreate;
}

async function testLogin() {
  console.log("\n[2] Login");

  const r1 = await req("POST", "/login", { body: { email: "alice@example.com", password: "password123" } });
  assert(r1.status === 200, "valid login returns 200");

  // Cookie flags
  const sc = r1.setCookie;
  assert(sc.includes("HttpOnly"), "cookie has HttpOnly");
  assert(/SameSite=Lax/i.test(sc), "cookie has SameSite=Lax");
  assert(sc.includes("Path=/"), "cookie has Path=/");

  // No token or hash in body
  const bodyStr = JSON.stringify(r1.json);
  assert(!bodyStr.includes("eyJ"), "no JWT token in response body");
  assert(!bodyStr.includes("$2"), "no hash in response body");

  // Wrong password → 401
  const r2 = await req("POST", "/login", { body: { email: "alice@example.com", password: "wrongpassword" } });
  assert(r2.status === 401, "wrong password returns 401");

  // Unknown email → 401
  const r3 = await req("POST", "/login", { body: { email: "nobody@example.com", password: "password123" } });
  assert(r3.status === 401, "unknown email returns 401");

  // Identical 401 bodies
  assert(JSON.stringify(r2.json) === JSON.stringify(r3.json), "wrong password and unknown email have identical 401 bodies");

  // Verify .select("+passwordHash") is called
  let selectCalled = false;
  const origFindOne = User.findOne;
  User.findOne = function (q) {
    const chain = buildChain(q.email);
    const origSelect = chain.select.bind(chain);
    chain.select = function (f) {
      if (typeof f === "string" && f.includes("+passwordHash")) selectCalled = true;
      return origSelect(f);
    };
    return chain;
  };
  await req("POST", "/login", { body: { email: "alice@example.com", password: "password123" } });
  assert(selectCalled, "login uses .select(+passwordHash)");
  User.findOne = origFindOne;
}

async function testMe() {
  console.log("\n[3] /me");

  const loginRes = await req("POST", "/login", { body: { email: "alice@example.com", password: "password123" } });
  const token = extractCookieValue(loginRes.setCookie);
  assert(!!token, "login produced a token (prerequisite)");
  if (!token) return; // can't continue without a valid token

  // Valid cookie → 200
  const r1 = await req("GET", "/me", { cookie: `venturedesk_token=${token}` });
  assert(r1.status === 200, "valid cookie returns 200");

  // No cookie → 401
  const r2 = await req("GET", "/me");
  assert(r2.status === 401, "no cookie returns 401");

  // Tampered token → 401
  const tampered = token.slice(0, -4) + "XXXX";
  const r3 = await req("GET", "/me", { cookie: `venturedesk_token=${tampered}` });
  assert(r3.status === 401, "tampered token returns 401");

  // Expired token → 401
  const jwt = require("jsonwebtoken");
  const expiredToken = jwt.sign({ sub: "someid" }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1ms" });
  await new Promise((r) => setTimeout(r, 10));
  const r4 = await req("GET", "/me", { cookie: `venturedesk_token=${expiredToken}` });
  assert(r4.status === 401, "expired token returns 401");

  // Wrong algorithm token (HS384 is not in the allowed list ["HS256"]) → 401
  const wrongAlgToken = jwt.sign({ sub: "someid" }, process.env.JWT_SECRET, { algorithm: "HS384" });
  const r5 = await req("GET", "/me", { cookie: `venturedesk_token=${wrongAlgToken}` });
  assert(r5.status === 401, "wrong algorithm token returns 401");

  // Deleted user → 401
  const origFindById = User.findById;
  User.findById = async () => null;
  const r6 = await req("GET", "/me", { cookie: `venturedesk_token=${token}` });
  assert(r6.status === 401, "deleted user returns 401");
  User.findById = origFindById;
}

async function testLogout() {
  console.log("\n[4] Logout");

  const loginRes = await req("POST", "/login", { body: { email: "alice@example.com", password: "password123" } });
  const token = extractCookieValue(loginRes.setCookie);
  const cookieFrag = `venturedesk_token=${token}`;

  // Logout with cookie → 200
  const r1 = await req("POST", "/logout", { cookie: cookieFrag });
  assert(r1.status === 200, "logout returns 200");

  const sc = r1.setCookie;
  // Cookie is cleared when its value is empty, Max-Age=0, or Expires is in the past
  const cleared =
    sc.includes("venturedesk_token=;") ||
    sc.includes("Max-Age=0") ||
    /Expires=.*1970|Thu, 01 Jan 1970/i.test(sc);
  assert(cleared, "logout clears the cookie value/expiry");
  assert(sc.includes("HttpOnly"), "cleared cookie retains HttpOnly");
  assert(sc.includes("Path=/"), "cleared cookie retains Path=/");

  // Logout without cookie → 200 (idempotent)
  const r2 = await req("POST", "/logout");
  assert(r2.status === 200, "logout without cookie is idempotent (200)");
}

async function testAuthorize() {
  console.log("\n[5] authorize middleware");

  // Route was registered at startup (before the 404 handler) — just use it.
  const founderLogin = await req("POST", "/login", { body: { email: "alice@example.com", password: "password123" } });
  const investorLogin = await req("POST", "/login", { body: { email: "bob@example.com", password: "password123" } });

  const founderToken = extractCookieValue(founderLogin.setCookie);
  const investorToken = extractCookieValue(investorLogin.setCookie);

  const port = server.address().port;

  const r1 = await fetch(`http://127.0.0.1:${port}/api/__test_founder_only__`, {
    headers: { Cookie: `venturedesk_token=${founderToken}` },
  });
  assert(r1.status === 200, "founder gets 200 on founder-only route");

  const r2 = await fetch(`http://127.0.0.1:${port}/api/__test_founder_only__`, {
    headers: { Cookie: `venturedesk_token=${investorToken}` },
  });
  assert(r2.status === 403, "investor gets 403 on founder-only route");

  const r3 = await fetch(`http://127.0.0.1:${port}/api/__test_founder_only__`);
  assert(r3.status === 401, "no cookie gets 401 on protected route");

  // authorize() with no roles should throw synchronously at definition time
  let threw = false;
  try { authorize(); } catch { threw = true; }
  assert(threw, "authorize() with no roles throws");
}

async function testMissingSecret() {
  console.log("\n[6] Missing JWT_SECRET / malformed JSON");

  const origSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;

  const r1 = await req("POST", "/login", { body: { email: "alice@example.com", password: "password123" } });
  assert(r1.status === 500, "missing JWT_SECRET returns 500");
  const bodyStr = JSON.stringify(r1.json);
  assert(
    !bodyStr.includes("JWT_SECRET") && !bodyStr.toLowerCase().includes("secret"),
    "secret name not leaked in 500 response"
  );

  process.env.JWT_SECRET = origSecret;

  // Malformed JSON body
  const malformed = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ bad json }",
  });
  assert(malformed.status === 400, "malformed JSON returns 400");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await startServer();
  try {
    await testRegister();
    await testLogin();
    await testMe();
    await testLogout();
    await testAuthorize();
    await testMissingSecret();
  } finally {
    await stopServer();
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Auth smoke test: ${passed} PASS, ${failed} FAIL`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exitCode = 1;
});
