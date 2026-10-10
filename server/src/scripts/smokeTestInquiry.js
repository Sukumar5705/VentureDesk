"use strict";

/**
 * Offline smoke test — Phase 5: Investor Discovery & Inquiry Management.
 * No real DB: models are stubbed in memory with a tiny filter matcher, so this
 * proves routing, validation, authorization and controller logic. It cannot
 * prove the real unique index or Mongo's atomic findOneAndUpdate — verify those
 * once against a real database (see manual checks in the report).
 * Run: node src/scripts/smokeTestInquiry.js
 */

process.env.JWT_SECRET = "a-sufficiently-long-secret-for-testing-32chars!!";
process.env.JWT_EXPIRES_IN = "2h";
process.env.NODE_ENV = "test";
process.env.CLIENT_ORIGIN = "http://localhost:5173";

const http = require("http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const users = new Map(), startups = new Map(), opps = new Map(), inquiries = new Map();
const audits = [];
let lastOppFilter = null;
let beforeInquiryUpdate = null; // hook to simulate a concurrent change

const oid = () => new mongoose.Types.ObjectId();
const str = (v) => (v == null ? v : v.toString());

// Resolve "a.b" paths
const getPath = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);

/** Minimal matcher for the filter shapes the controllers build. */
function matches(doc, filter) {
  return Object.entries(filter).every(([k, cond]) => {
    if (k === "$or") return cond.some((f) => matches(doc, f));
    const v = getPath(doc, k);
    if (cond && typeof cond === "object" && !(cond instanceof mongoose.Types.ObjectId)) {
      if ("$regex" in cond) return typeof v === "string" && new RegExp(cond.$regex, cond.$options).test(v);
      if ("$gte" in cond && !(v >= cond.$gte)) return false;
      if ("$lte" in cond && !(v <= cond.$lte)) return false;
      return true;
    }
    return str(v) === str(cond);
  });
}

function chain(getRows, { populate } = {}) {
  const st = { sort: null, skip: 0, limit: Infinity, pops: [] };
  const c = {
    select() { return c; },
    sort(s) { st.sort = s; return c; },
    skip(n) { st.skip = n; return c; },
    limit(n) { st.limit = n; return c; },
    populate(p) { st.pops.push(p); return c; },
    lean() { return c; },
    then(res, rej) {
      let rows = getRows().map((r) => ({ ...r }));
      if (st.sort) {
        const [[f, d]] = Object.entries(st.sort);
        rows.sort((a, b) => ((getPath(a, f) > getPath(b, f)) - (getPath(a, f) < getPath(b, f))) * d);
      }
      rows = rows.slice(st.skip, st.skip + st.limit);
      if (populate) rows = rows.map((r) => populate(r, st.pops));
      return Promise.resolve(rows).then(res, rej);
    },
  };
  return c;
}

// ── Stubs ─────────────────────────────────────────────────────────────────────
const User = require("../models/User");
User.findById = async (id) => users.get(str(id)) ?? null;

const Startup = require("../models/Startup");
function singleChain(getRow) {
  const c = { select: () => c, lean: () => c, then: (res, rej) => { const r = getRow(); return Promise.resolve(r ? { ...r } : null).then(res, rej); } };
  return c;
}
Startup.findOne = (q) => singleChain(() => [...startups.values()].find((s) => matches(s, q)) ?? null);

const Opportunity = require("../models/Opportunity");
Opportunity.find = (f) => { lastOppFilter = f; return chain(() => [...opps.values()].filter((o) => matches(o, f))); };
Opportunity.countDocuments = async (f) => [...opps.values()].filter((o) => matches(o, f)).length;
Opportunity.findOne = (q) => singleChain(() => [...opps.values()].find((o) => matches(o, q)) ?? null);

const InvestorInquiry = require("../models/InvestorInquiry");
InvestorInquiry.create = async (data) => {
  // emulate the unique { investor, opportunity } index
  for (const i of inquiries.values()) {
    if (str(i.investor) === str(data.investor) && str(i.opportunity) === str(data.opportunity)) {
      const e = new Error("E11000 duplicate key error collection: secret.db index: x"); e.code = 11000; throw e;
    }
  }
  const doc = {
    _id: oid(), status: "new", nextStep: undefined, statusUpdatedAt: new Date(),
    createdAt: new Date(), updatedAt: new Date(), ...data
  };
  inquiries.set(str(doc._id), doc);
  return doc;
};
InvestorInquiry.find = (f) => chain(() => [...inquiries.values()].filter((i) => matches(i, f)), {
  populate(row, pops) {
    for (const p of pops) {
      if (p.path === "investor") {
        const u = users.get(str(row.investor));
        row.investor = u ? { _id: u._id, fullName: u.fullName } : null; // select honoured: no email
      }
      if (p.path === "opportunity") {
        const o = opps.get(str(row.opportunity));
        const fields = p.select.split(" ");
        row.opportunity = o ? Object.fromEntries([["_id", o._id], ...fields.map((k) => [k, o[k]])]) : null;
      }
    }
    return row;
  },
});
InvestorInquiry.countDocuments = async (f) => [...inquiries.values()].filter((i) => matches(i, f)).length;
InvestorInquiry.findOne = (q) => singleChain(() => [...inquiries.values()].find((i) => matches(i, q)) ?? null);
InvestorInquiry.findOneAndUpdate = async (filter, update) => {
  if (beforeInquiryUpdate) { const h = beforeInquiryUpdate; beforeInquiryUpdate = null; h(); }
  const doc = [...inquiries.values()].find((i) => matches(i, filter));
  if (!doc) return null;
  Object.assign(doc, update.$set, { updatedAt: new Date() });
  return { ...doc };
};

const AuditLog = require("../models/AuditLog");
AuditLog.create = async (d) => { audits.push({ ...d }); return d; };

const app = require("../../../phase5-changes/src/app");

// ── Harness ───────────────────────────────────────────────────────────────────
let passed = 0, failed = 0, server, BASE;
const assert = (c, l) => { if (c) { console.log(`  PASS  ${l}`); passed++; } else { console.error(`  FAIL  ${l}`); failed++; } };

async function api(method, path, { body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch { }
  return { status: res.status, json };
}

function seedUser(fullName, role) {
  const doc = {
    _id: oid(), fullName, email: `${fullName.replace(/\s/g, "").toLowerCase()}@x.io`, role,
    passwordHash: "HASH", createdAt: new Date()
  };
  users.set(str(doc._id), doc);
  const token = jwt.sign({ sub: str(doc._id) }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "2h" });
  return { id: str(doc._id), cookie: `venturedesk_token=${token}` };
}
function seedStartup(ownerId, name, extra = {}) {
  const doc = { _id: oid(), owner: ownerId, name, description: "d", industry: "fintech", location: "Hyderabad", ...extra };
  startups.set(str(doc._id), doc);
  return doc;
}
function seedOpp(startup, o = {}) {
  const doc = {
    _id: oid(), startup: startup._id, title: "Seed round", stage: "seed", fundingRequired: 5_000_000,
    description: "desc", useOfFunds: "hiring", status: "approved", publishedAt: new Date(),
    reviewNote: "SECRET NOTE", reviewedBy: oid(),
    startupSnapshot: { name: startup.name, description: "snap", industry: startup.industry, location: startup.location },
    ...o
  };
  opps.set(str(doc._id), doc);
  return doc;
}

const founderA = seedUser("Fiona Founder", "founder");
const founderB = seedUser("Frank Founder", "founder");
const founderC = seedUser("Nostartup Founder", "founder");
const invX = seedUser("Ivy Investor", "investor");
const invY = seedUser("Ian Investor", "investor");
const admin = seedUser("Ada Admin", "admin");
const stA = seedStartup(founderA.id, "AcmePay");
const stB = seedStartup(founderB.id, "BetaHealth", { industry: "healthtech", location: "Mumbai" });

const oApproved = seedOpp(stA, { title: "AcmePay Seed", fundingRequired: 5_000_000 });
const oBig = seedOpp(stA, { title: "AcmePay Series A", stage: "series_a", fundingRequired: 90_000_000, publishedAt: new Date(Date.now() - 1000) });
const oHealth = seedOpp(stB, {
  title: "Beta Health", fundingRequired: 2_000_000,
  startupSnapshot: { name: "BetaHealth", description: "s", industry: "healthtech", location: "Mumbai" }
});
const oDraft = seedOpp(stA, { title: "Hidden draft", status: "draft" });
const oPending = seedOpp(stA, { title: "Hidden pending", status: "pending_review" });
const oRejected = seedOpp(stA, { title: "Hidden rejected", status: "rejected" });
const oChanges = seedOpp(stA, { title: "Hidden changes", status: "changes_requested" });

// ── Tests ─────────────────────────────────────────────────────────────────────
async function testDiscovery() {
  console.log("\n[Discovery]");
  let r = await api("GET", "/api/opportunities");
  assert(r.status === 200, "public GET works without auth");
  const titles = r.json.data.map((d) => d.title).sort();
  assert(JSON.stringify(titles) === JSON.stringify(["AcmePay Seed", "AcmePay Series A", "Beta Health"]), "only approved opportunities returned");
  assert(r.json.pagination.page === 1 && typeof r.json.pagination.page === "number" && r.json.pagination.limit === 12 && r.json.pagination.total === 3, "pagination defaults are numbers");
  const raw = JSON.stringify(r.json);
  assert(!raw.includes("SECRET NOTE") && !raw.includes("reviewNote") && !raw.includes("reviewedBy") && !raw.includes("owner"), "no review/internal/owner fields leak");
  const d = r.json.data[0];
  assert(!("startup" in d && typeof d.startup === "string") && d.startup.name && d.startup.industry, "startup info comes from snapshot object, not an id");
  assert(Object.keys(d).sort().join() === "description,fundingRequired,id,publishedAt,stage,startup,title,useOfFunds", "explicit DTO keys only");

  // Live startup edits must not change the listing
  stA.name = "RENAMED-LIVE"; stA.industry = "edtech";
  r = await api("GET", "/api/opportunities?industry=fintech");
  assert(r.json.data.length === 2 && r.json.data.every((x) => x.startup.name === "AcmePay"), "snapshot used; live startup edits not exposed");
  stA.name = "AcmePay"; stA.industry = "fintech";

  r = await api("GET", "/api/opportunities?stage=series_a");
  assert(r.json.data.length === 1 && r.json.data[0].title === "AcmePay Series A", "stage filter");
  r = await api("GET", "/api/opportunities?minFunding=3000000&maxFunding=10000000");
  assert(r.json.data.length === 1 && r.json.data[0].title === "AcmePay Seed", "INR funding range filter");
  r = await api("GET", "/api/opportunities?location=mumb");
  assert(r.json.data.length === 1 && r.json.data[0].title === "Beta Health", "location partial case-insensitive");
  r = await api("GET", "/api/opportunities?search=beta");
  assert(r.json.data.length === 1, "search over title/startup name");
  r = await api("GET", "/api/opportunities?search=Hidden");
  assert(r.status === 200 && r.json.data.length === 0 && r.json.pagination.total === 0, "search cannot surface unapproved; empty result is 200");
  r = await api("GET", "/api/opportunities?limit=2&page=2&sortBy=fundingRequired&order=asc");
  assert(r.json.data.length === 1 && r.json.data[0].title === "AcmePay Series A" && r.json.pagination.pages === 2, "pagination + sorting asc");
  r = await api("GET", "/api/opportunities?sortBy=fundingRequired&order=desc");
  assert(r.json.data[0].title === "AcmePay Series A", "sorting desc");

  // approved-only is enforced in the actual DB filter, whatever the client sends
  r = await api("GET", "/api/opportunities?status=draft");
  assert(r.status === 400, "status param rejected (strict)");
  await api("GET", "/api/opportunities?search=a.*&location=(");
  assert(lastOppFilter.status === "approved", "DB filter always has status=approved");
  assert(lastOppFilter.$or[0].title.$regex === "a\\.\\*", "search regex is escaped");
  assert(lastOppFilter["startupSnapshot.location"].$regex === "\\(", "location regex is escaped");
  r = await api("GET", "/api/opportunities?search[$ne]=x");
  assert(r.status === 400, "operator-injection object in query rejected");

  for (const [q, label] of [
    ["page=0", "page=0"], ["page=-1", "negative page"], ["page=abc", "non-numeric page"], ["limit=0", "limit=0"], ["limit=51", "limit over max"],
    ["minFunding=-5", "negative minFunding"], ["maxFunding=0", "maxFunding=0"], ["minFunding=1.5", "decimal funding"],
    ["minFunding=900&maxFunding=100", "min > max"], ["stage=bogus", "bad stage"], ["industry=bogus", "bad industry"],
    ["sortBy=passwordHash", "unsupported sortBy"], ["order=sideways", "bad order"], ["foo=bar", "unknown param"],
  ]) {
    r = await api("GET", `/api/opportunities?${q}`);
    assert(r.status === 400 && r.json.error.code === "VALIDATION_ERROR", `rejected: ${label}`);
  }
  r = await api("GET", "/api/opportunities/mine");
  assert(r.status === 401, "/mine still guarded (route order intact)");
}

async function testCreateInquiry() {
  console.log("\n[Create inquiry]");
  const url = (o) => `/api/opportunities/${o._id}/inquiries`;
  let r = await api("POST", url(oApproved), { body: { message: "hi" } });
  assert(r.status === 401, "unauthenticated -> 401");
  r = await api("POST", url(oApproved), { cookie: founderA.cookie, body: { message: "hi" } });
  assert(r.status === 403, "founder -> 403");
  r = await api("POST", url(oApproved), { cookie: admin.cookie, body: { message: "hi" } });
  assert(r.status === 403, "admin -> 403");
  r = await api("POST", "/api/opportunities/not-an-id/inquiries", { cookie: invX.cookie, body: { message: "hi" } });
  assert(r.status === 400, "bad id -> 400");
  r = await api("POST", url({ _id: oid() }), { cookie: invX.cookie, body: { message: "hi" } });
  assert(r.status === 404, "nonexistent opportunity -> 404");
  for (const o of [oDraft, oPending, oRejected, oChanges]) {
    r = await api("POST", url(o), { cookie: invX.cookie, body: { message: "hi" } });
    assert(r.status === 404, `unapproved (${o.status}) -> 404`);
  }
  for (const [body, label] of [
    [{}, "missing message"], [{ message: "   " }, "blank message"], [{ message: "x".repeat(1001) }, "too long"],
    [{ message: "hi", status: "closed_won" }, "status tampering"], [{ message: "hi", investor: invY.id }, "investor tampering"],
    [{ message: "hi", startup: String(stB._id) }, "startup tampering"], [{ message: "hi", opportunity: String(oHealth._id) }, "opportunity tampering"],
    [{ message: 5 }, "non-string message"],
  ]) {
    r = await api("POST", url(oApproved), { cookie: invX.cookie, body });
    assert(r.status === 400, `rejected: ${label}`);
  }
  assert(inquiries.size === 0, "no inquiry persisted by rejected requests");

  r = await api("POST", url(oApproved), { cookie: invX.cookie, body: { message: "  Interested!  " } });
  assert(r.status === 201 && r.json.data.status === "new" && r.json.data.message === "Interested!", "created with trimmed message, status=new");
  const saved = [...inquiries.values()][0];
  assert(str(saved.investor) === invX.id && str(saved.startup) === str(stA._id), "investor from session, startup from DB");
  assert(!JSON.stringify(r.json).includes(invX.id) && !("investor" in r.json.data) && !("startup" in r.json.data), "response has no investor/startup ids");
  assert(audits.some((a) => a.action === "inquiry.created" && a.newStatus === "new"), "audit: inquiry.created");

  r = await api("POST", url(oApproved), { cookie: invX.cookie, body: { message: "again" } });
  assert(r.status === 409 && r.json.error.code === "CONFLICT", "duplicate -> 409");
  assert(!JSON.stringify(r.json).includes("E11000") && !JSON.stringify(r.json).includes("index"), "no raw Mongo error leaked");
  r = await api("POST", url(oApproved), { cookie: invY.cookie, body: { message: "me too" } });
  assert(r.status === 201, "different investor can inquire on same opportunity");
  r = await api("POST", url(oHealth), { cookie: invX.cookie, body: { message: "other opp" } });
  assert(r.status === 201, "same investor can inquire on a different opportunity");
}

async function testLists() {
  console.log("\n[Lists]");
  let r = await api("GET", "/api/inquiries/mine");
  assert(r.status === 401, "mine unauthenticated -> 401");
  r = await api("GET", "/api/inquiries/mine", { cookie: founderA.cookie });
  assert(r.status === 403, "mine as founder -> 403");
  r = await api("GET", "/api/inquiries/mine", { cookie: invX.cookie });
  assert(r.status === 200 && r.json.data.length === 2 && r.json.pagination.total === 2, "investor sees own 2 inquiries");
  const raw = JSON.stringify(r.json);
  assert(!raw.includes(invY.id) && !raw.includes("SECRET NOTE") && !raw.includes("passwordHash") && !raw.includes("reviewNote"), "no other investors / internal data");
  assert(r.json.data.every((i) => i.opportunity && i.opportunity.title && i.opportunity.startup.name), "opportunity summary from snapshot");
  r = await api("GET", `/api/inquiries/mine?investor=${invY.id}`, { cookie: invX.cookie });
  assert(r.status === 400, "investor override param rejected");
  r = await api("GET", "/api/inquiries/mine?status=contacted", { cookie: invX.cookie });
  assert(r.status === 200 && r.json.data.length === 0, "status filter works");
  r = await api("GET", "/api/inquiries/mine?status=bogus&limit=999", { cookie: invX.cookie });
  assert(r.status === 400, "invalid status/limit rejected");
  r = await api("GET", "/api/inquiries/mine?limit=1&page=2", { cookie: invX.cookie });
  assert(r.status === 200 && r.json.data.length === 1 && r.json.pagination.pages === 2, "pagination");

  console.log("\n[Founder pipeline]");
  r = await api("GET", "/api/startups/me/inquiries");
  assert(r.status === 401, "unauthenticated -> 401");
  r = await api("GET", "/api/startups/me/inquiries", { cookie: invX.cookie });
  assert(r.status === 403, "investor -> 403");
  r = await api("GET", "/api/startups/me/inquiries", { cookie: founderC.cookie });
  assert(r.status === 404, "founder without startup -> 404");
  r = await api("GET", "/api/startups/me/inquiries", { cookie: founderA.cookie });
  assert(r.status === 200 && r.json.data.length === 2, "founder A sees only own startup's 2 inquiries");
  const rawA = JSON.stringify(r.json);
  assert(!rawA.includes("@x.io") && !rawA.includes("passwordHash") && !rawA.includes("email"), "investor email/credentials not exposed");
  assert(r.json.data.every((i) => i.investor.fullName && Object.keys(i.investor).sort().join() === "fullName,id"), "investor limited to id + fullName");
  r = await api("GET", "/api/startups/me/inquiries", { cookie: founderB.cookie });
  assert(r.json.data.length === 1 && r.json.data[0].opportunity.title === "Beta Health", "founder B sees only their own");
  r = await api("GET", `/api/startups/me/inquiries?startup=${stB._id}`, { cookie: founderA.cookie });
  assert(r.status === 400, "startup override param rejected");
  r = await api("GET", "/api/startups/me/inquiries?status=new&limit=1", { cookie: founderA.cookie });
  assert(r.status === 200 && r.json.data.length === 1 && r.json.pagination.total === 2, "filter + pagination");
  r = await api("GET", "/api/startups/me");
  assert(r.status === 401, "existing /startups/me untouched");
}

async function testStatus() {
  console.log("\n[Status transitions]");
  const ofX = [...inquiries.values()].find((i) => str(i.investor) === invX.id && str(i.opportunity) === str(oApproved._id));
  const ofXB = [...inquiries.values()].find((i) => str(i.investor) === invX.id && str(i.opportunity) === str(oHealth._id));
  const ofY = [...inquiries.values()].find((i) => str(i.investor) === invY.id);
  const patch = (i, who, body) => api("PATCH", `/api/inquiries/${i._id}/status`, { cookie: who.cookie, body });

  let r = await api("PATCH", `/api/inquiries/${ofX._id}/status`, { body: { status: "contacted" } });
  assert(r.status === 401, "unauthenticated -> 401");
  r = await patch(ofX, admin, { status: "contacted" });
  assert(r.status === 403, "admin -> 403 (not silently granted)");
  r = await api("PATCH", "/api/inquiries/xyz/status", { cookie: founderA.cookie, body: { status: "contacted" } });
  assert(r.status === 400, "bad id -> 400");
  r = await patch({ _id: oid() }, founderA, { status: "contacted" });
  assert(r.status === 404, "unknown inquiry -> 404");
  r = await patch(ofX, founderB, { status: "contacted" });
  assert(r.status === 404 && ofX.status === "new", "other founder -> 404, unchanged (IDOR)");
  r = await patch(ofX, founderC, { status: "contacted" });
  assert(r.status === 404, "founder without startup -> 404");
  r = await patch(ofX, invY, { status: "closed_lost" });
  assert(r.status === 404 && ofX.status === "new", "other investor -> 404, unchanged (IDOR)");
  for (const [body, label] of [
    [{}, "missing status"], [{ status: "bogus" }, "bad enum"], [{ status: "contacted", investor: invY.id }, "investor tampering"],
    [{ status: "contacted", startup: String(stB._id) }, "startup tampering"], [{ status: "contacted", statusUpdatedBy: invY.id }, "audit/system field"],
    [{ status: "contacted", nextStep: "x".repeat(501) }, "nextStep too long"], [{ status: "contacted", reason: "x" }, "client reason"],
  ]) {
    r = await patch(ofX, founderA, body);
    assert(r.status === 400, `rejected: ${label}`);
  }
  assert(ofX.status === "new" && audits.filter((a) => a.action === "inquiry.status_changed").length === 0, "no change/audit from rejected requests");

  // Investor restrictions
  r = await patch(ofXB, invX, { status: "contacted" });
  assert(r.status === 403 && ofXB.status === "new", "investor cannot advance pipeline");
  r = await patch(ofXB, invX, { status: "closed_lost", nextStep: "n" });
  assert(r.status === 403, "investor cannot set nextStep");
  r = await patch(ofXB, invX, { status: "closed_lost" });
  assert(r.status === 200 && r.json.data.status === "closed_lost", "investor can withdraw own inquiry (new -> closed_lost)");
  const lastAudit = audits[audits.length - 1];
  assert(lastAudit.action === "inquiry.status_changed" && lastAudit.previousStatus === "new" && lastAudit.newStatus === "closed_lost" && lastAudit.actor === invX.id, "audit row written with actor/prev/new");
  r = await patch(ofXB, invX, { status: "closed_lost" });
  assert(r.status === 409, "terminal closed_lost -> 409");

  // Full state machine as founder, on ofX (founder A)
  const ALL = ["new", "contacted", "meeting_scheduled", "due_diligence", "closed_won", "closed_lost"];
  const OK = {
    new: ["contacted", "closed_lost"], contacted: ["meeting_scheduled", "closed_lost"],
    meeting_scheduled: ["due_diligence", "closed_lost"], due_diligence: ["closed_won", "closed_lost"], closed_won: [], closed_lost: []
  };
  let bad = 0, good = 0;
  for (const from of ALL) for (const to of ALL) {
    const probe = { _id: oid(), investor: invY.id, startup: stA._id, opportunity: oid(), message: "m", status: from, statusUpdatedAt: new Date() };
    inquiries.set(str(probe._id), probe);
    const res = await patch(probe, founderA, { status: to });
    const expectOk = OK[from].includes(to);
    if (expectOk ? (res.status === 200 && probe.status === to) : (res.status === 409 && probe.status === from)) good++; else { bad++; console.error(`   mismatch ${from}->${to}: ${res.status}`); }
    inquiries.delete(str(probe._id));
  }
  assert(bad === 0 && good === 36, `all 36 from/to transition pairs behave per state machine (${good}/36)`);

  const before = audits.length;
  r = await patch(ofX, founderA, { status: "contacted", nextStep: "  Schedule intro call " });
  assert(r.status === 200 && r.json.data.status === "contacted" && r.json.data.nextStep === "Schedule intro call", "founder advances + nextStep trimmed");
  assert(str(ofX.statusUpdatedBy) === founderA.id && ofX.statusUpdatedAt instanceof Date, "statusUpdatedBy/At set");
  assert(audits.length === before + 1, "exactly one audit row per success");
  assert(!("investor" in r.json.data) && !("startup" in r.json.data), "response DTO has no ownership ids");
  r = await patch(ofX, founderA, { status: "closed_won" });
  assert(r.status === 409 && ofX.status === "contacted" && audits.length === before + 1, "invalid jump -> 409, no audit");

  // Concurrent change: another request moves status between our read and write
  beforeInquiryUpdate = () => { ofX.status = "closed_lost"; };
  r = await patch(ofX, founderA, { status: "meeting_scheduled" });
  assert(r.status === 409 && ofX.status === "closed_lost" && audits.length === before + 1, "stale update -> 409, newer state not overwritten, no audit");

  // Founder A cannot touch Y's inquiry on founder A? (ofY is on oApproved -> startup A, so allowed); B cannot
  r = await patch(ofY, founderB, { status: "contacted" });
  assert(r.status === 404, "founder B cannot manage inquiry of startup A");
}

async function main() {
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  BASE = `http://127.0.0.1:${server.address().port}`;
  try { await testDiscovery(); await testCreateInquiry(); await testLists(); await testStatus(); }
  finally { await new Promise((r) => server.close(r)); }
  console.log(`\n${"─".repeat(50)}\nPhase 5 smoke test: ${passed} PASS, ${failed} FAIL`);
  if (failed) process.exitCode = 1;
}
main().catch((e) => { console.error("Unexpected error:", e); process.exitCode = 1; });
