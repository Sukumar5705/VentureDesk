"use strict";

require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const {
    User,
    Startup,
    Opportunity,
    InvestorInquiry,
    AuditLog,
} = require("../models");

const DEMO_PASSWORD = "DemoPass123!";
const DEMO_AUDIT_MARKER = "[DEMO_SEED]";

const usersData = [
    { key: "founder_nova", fullName: "Aarav Mehta", email: "aarav.founder@venturedesk.demo", role: "founder" },
    { key: "founder_green", fullName: "Ananya Rao", email: "ananya.founder@venturedesk.demo", role: "founder" },
    { key: "founder_fin", fullName: "Rohan Kapoor", email: "rohan.founder@venturedesk.demo", role: "founder" },
    { key: "founder_health", fullName: "Diya Sharma", email: "diya.founder@venturedesk.demo", role: "founder" },
    { key: "founder_learn", fullName: "Kabir Iyer", email: "kabir.founder@venturedesk.demo", role: "founder" },

    { key: "investor_1", fullName: "Meera Shah", email: "meera.investor@venturedesk.demo", role: "investor" },
    { key: "investor_2", fullName: "Arjun Nair", email: "arjun.investor@venturedesk.demo", role: "investor" },
    { key: "investor_3", fullName: "Ishita Verma", email: "ishita.investor@venturedesk.demo", role: "investor" },
    { key: "investor_4", fullName: "Dev Malhotra", email: "dev.investor@venturedesk.demo", role: "investor" },

    { key: "admin", fullName: "VentureDesk Demo Admin", email: "admin@venturedesk.demo", role: "admin" },
];

const startupsData = [
    {
        key: "nova",
        ownerKey: "founder_nova",
        name: "NovaTech AI",
        description: "An AI workflow platform that helps mid-market teams automate repetitive operations, connect business tools, and measure time saved.",
        industry: "ai_ml",
        location: "Hyderabad, Telangana, India",
        website: "https://example.com/novatech",
    },
    {
        key: "green",
        ownerKey: "founder_green",
        name: "GreenRoute Mobility",
        description: "A fleet intelligence platform helping logistics operators reduce fuel consumption, plan efficient routes, and measure transport emissions.",
        industry: "climate_energy",
        location: "Bengaluru, Karnataka, India",
        website: "https://example.com/greenroute",
    },
    {
        key: "fin",
        ownerKey: "founder_fin",
        name: "LedgerLeaf",
        description: "A cash-flow and invoice intelligence workspace built for small businesses that need clearer financial visibility without complex enterprise software.",
        industry: "fintech",
        location: "Mumbai, Maharashtra, India",
        website: "https://example.com/ledgerleaf",
    },
    {
        key: "health",
        ownerKey: "founder_health",
        name: "CareOrbit",
        description: "A patient coordination platform that helps clinics manage follow-ups, appointment workflows, and patient communication in one place.",
        industry: "healthtech",
        location: "Pune, Maharashtra, India",
        website: "https://example.com/careorbit",
    },
    {
        key: "learn",
        ownerKey: "founder_learn",
        name: "SkillSpring",
        description: "A project-based learning platform connecting early-career developers with structured practice, mentor feedback, and measurable skill progress.",
        industry: "edtech",
        location: "Chennai, Tamil Nadu, India",
        website: "https://example.com/skillspring",
    },
];

const opportunitiesData = [
    {
        key: "nova_seed",
        startupKey: "nova",
        title: "NovaTech AI — Seed Round",
        stage: "seed",
        fundingRequired: 6000000,
        description: "Raising seed capital to expand product integrations, strengthen enterprise security, and scale customer onboarding.",
        useOfFunds: "45% product and engineering, 30% go-to-market, 15% cloud infrastructure, and 10% operations.",
        status: "approved",
        daysAgo: 12,
    },
    {
        key: "nova_preseed",
        startupKey: "nova",
        title: "NovaTech AI — Product Expansion",
        stage: "pre_seed",
        fundingRequired: 1800000,
        description: "A smaller product expansion round focused on workflow templates and analytics.",
        useOfFunds: "Product engineering, design research, and pilot customer support.",
        status: "draft",
        daysAgo: 2,
    },
    {
        key: "green_seed",
        startupKey: "green",
        title: "GreenRoute Mobility — Climate Seed Round",
        stage: "seed",
        fundingRequired: 8500000,
        description: "Seeking capital to expand fleet pilots and improve route optimization for regional logistics providers.",
        useOfFunds: "Fleet integrations, routing models, customer pilots, and emissions reporting.",
        status: "approved",
        daysAgo: 8,
    },
    {
        key: "ledger_preseed",
        startupKey: "fin",
        title: "LedgerLeaf — Pre-Seed Funding",
        stage: "pre_seed",
        fundingRequired: 3000000,
        description: "Funding to launch paid accounting integrations and validate repeatable acquisition among small businesses.",
        useOfFunds: "Integrations, compliance review, customer discovery, and onboarding.",
        status: "approved",
        daysAgo: 6,
    },
    {
        key: "care_seed",
        startupKey: "health",
        title: "CareOrbit — Seed Extension",
        stage: "seed",
        fundingRequired: 12000000,
        description: "A seed extension to support clinic deployments and build a more complete patient coordination workflow.",
        useOfFunds: "Clinic implementation, product development, customer success, and security work.",
        status: "pending_review",
        daysAgo: 1,
    },
    {
        key: "skillspring_preseed",
        startupKey: "learn",
        title: "SkillSpring — Learning Platform Launch",
        stage: "pre_seed",
        fundingRequired: 2500000,
        description: "Capital to launch new guided project tracks and expand mentor-led cohorts.",
        useOfFunds: "Learning content, mentor network, platform improvements, and launch marketing.",
        status: "changes_requested",
        reviewNote: "Please provide more detail on mentor acquisition and cohort-level retention.",
        daysAgo: 4,
    },
    {
        key: "green_seriesa",
        startupKey: "green",
        title: "GreenRoute Mobility — Series A",
        stage: "series_a",
        fundingRequired: 35000000,
        description: "A planned scale-up round to expand into additional regions and deepen fleet partnerships.",
        useOfFunds: "Regional expansion, enterprise integrations, and hiring.",
        status: "rejected",
        reviewNote: "The current application needs stronger evidence of repeatable revenue and regional demand.",
        daysAgo: 18,
    },
    {
        key: "ledger_seed",
        startupKey: "fin",
        title: "LedgerLeaf — SMB Growth Round",
        stage: "seed",
        fundingRequired: 9500000,
        description: "A growth-focused seed round for expanding integrations and serving additional small-business segments.",
        useOfFunds: "Engineering, partnerships, customer success, and acquisition experiments.",
        status: "approved",
        daysAgo: 3,
    },
];

const inquiryData = [
    { key: "inq_nova_meera", opportunityKey: "nova_seed", investorKey: "investor_1", message: "We invest in workflow automation and would like to review your traction, retention, and enterprise pipeline.", status: "due_diligence", nextStep: "Share the product metrics and schedule a technical diligence call." },
    { key: "inq_nova_arjun", opportunityKey: "nova_seed", investorKey: "investor_2", message: "Interested in learning more about the seed round and your integration roadmap.", status: "meeting_scheduled", nextStep: "Introductory call scheduled for next week." },
    { key: "inq_green_ishita", opportunityKey: "green_seed", investorKey: "investor_3", message: "Your fleet efficiency focus is relevant to our climate portfolio. Could we discuss pilot results?", status: "contacted", nextStep: "Send available pilot case studies." },
    { key: "inq_green_dev", opportunityKey: "green_seed", investorKey: "investor_4", message: "Please share more information about fleet onboarding and measurable fuel savings.", status: "new", nextStep: "" },
    { key: "inq_ledger_meera", opportunityKey: "ledger_preseed", investorKey: "investor_1", message: "We would like to understand your target customer profile and accounting integrations.", status: "closed_won", nextStep: "Demo and commercial follow-up completed." },
    { key: "inq_ledger_arjun", opportunityKey: "ledger_seed", investorKey: "investor_2", message: "Interested in the SMB financial tooling opportunity. Please share current traction and unit economics.", status: "closed_lost", nextStep: "" },
    { key: "inq_ledger_ishita", opportunityKey: "ledger_seed", investorKey: "investor_3", message: "Could you share your roadmap for integrations and paid conversion?", status: "new", nextStep: "" },
];

function dateDaysAgo(daysAgo) {
    return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

async function main() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is missing. Check server/.env before running this script.");
    }

    await connectDB();

    // Hash once; every demo account gets the same known demo password.
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const ids = { users: {}, startups: {}, opportunities: {}, inquiries: {} };

    for (const userData of usersData) {
        const user = await User.findOneAndUpdate(
            { email: userData.email },
            {
                $set: {
                    fullName: userData.fullName,
                    email: userData.email,
                    role: userData.role,
                    passwordHash,
                },
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        ids.users[userData.key] = user._id;
    }

    for (const startupData of startupsData) {
        const { ownerKey, key, ...fields } = startupData;
        const startup = await Startup.findOneAndUpdate(
            { owner: ids.users[ownerKey] },
            { $set: { ...fields, owner: ids.users[ownerKey] } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        ids.startups[key] = startup._id;
    }

    for (const opportunityData of opportunitiesData) {
        const { key, startupKey, daysAgo, ...fields } = opportunityData;
        const startup = await Startup.findById(ids.startups[startupKey]).lean();
        const createdAt = dateDaysAgo(daysAgo);
        const statusFields = {
            ...fields,
            startup: ids.startups[startupKey],
            createdAt,
            updatedAt: createdAt,
        };

        if (["pending_review", "changes_requested", "approved", "rejected"].includes(fields.status)) {
            statusFields.submittedAt = createdAt;
            statusFields.startupSnapshot = {
                name: startup.name,
                description: startup.description,
                industry: startup.industry,
                location: startup.location,
                ...(startup.website ? { website: startup.website } : {}),
            };
        }
        if (fields.status === "approved") {
            statusFields.publishedAt = dateDaysAgo(Math.max(0, daysAgo - 1));
            statusFields.reviewedBy = ids.users.admin;
            statusFields.reviewedAt = dateDaysAgo(Math.max(0, daysAgo - 1));
        }
        if (["changes_requested", "rejected"].includes(fields.status)) {
            statusFields.reviewedBy = ids.users.admin;
            statusFields.reviewedAt = dateDaysAgo(Math.max(0, daysAgo - 1));
        }

        const opportunity = await Opportunity.findOneAndUpdate(
            { startup: ids.startups[startupKey], title: fields.title },
            { $set: statusFields },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        ids.opportunities[key] = opportunity._id;
    }

    for (const inquirySeed of inquiryData) {
        const { key, opportunityKey, investorKey, ...fields } = inquirySeed;
        const opportunity = await Opportunity.findById(ids.opportunities[opportunityKey]).lean();
        const statusUpdatedAt = dateDaysAgo(1);
        const inquiry = await InvestorInquiry.findOneAndUpdate(
            {
                investor: ids.users[investorKey],
                opportunity: ids.opportunities[opportunityKey],
            },
            {
                $set: {
                    ...fields,
                    investor: ids.users[investorKey],
                    opportunity: ids.opportunities[opportunityKey],
                    startup: opportunity.startup,
                    statusUpdatedBy: ids.users[investorKey],
                    statusUpdatedAt,
                },
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        ids.inquiries[key] = inquiry._id;
    }

    // Keep the script re-runnable without accumulating its own audit records.
    await AuditLog.deleteMany({ reason: { $regex: "^\\[DEMO_SEED\\]" } });

    const auditRecords = [
        {
            actor: ids.users.founder_nova,
            action: AuditLog.ACTIONS.OPPORTUNITY_SUBMITTED,
            resourceType: "Opportunity",
            resourceId: ids.opportunities.nova_seed,
            previousStatus: "draft",
            newStatus: "pending_review",
            reason: `${DEMO_AUDIT_MARKER} NovaTech demo submission`,
        },
        {
            actor: ids.users.admin,
            action: AuditLog.ACTIONS.OPPORTUNITY_APPROVED,
            resourceType: "Opportunity",
            resourceId: ids.opportunities.nova_seed,
            previousStatus: "pending_review",
            newStatus: "approved",
            reason: `${DEMO_AUDIT_MARKER} NovaTech demo approval`,
        },
        {
            actor: ids.users.founder_green,
            action: AuditLog.ACTIONS.OPPORTUNITY_SUBMITTED,
            resourceType: "Opportunity",
            resourceId: ids.opportunities.green_seed,
            previousStatus: "draft",
            newStatus: "pending_review",
            reason: `${DEMO_AUDIT_MARKER} GreenRoute demo submission`,
        },
        {
            actor: ids.users.admin,
            action: AuditLog.ACTIONS.OPPORTUNITY_CHANGES_REQUESTED,
            resourceType: "Opportunity",
            resourceId: ids.opportunities.skillspring_preseed,
            previousStatus: "pending_review",
            newStatus: "changes_requested",
            reason: `${DEMO_AUDIT_MARKER} SkillSpring demo review`,
        },
        {
            actor: ids.users.investor_1,
            action: AuditLog.ACTIONS.INQUIRY_CREATED,
            resourceType: "InvestorInquiry",
            resourceId: ids.inquiries.inq_nova_meera,
            newStatus: "new",
            reason: `${DEMO_AUDIT_MARKER} Demo investor inquiry`,
        },
        {
            actor: ids.users.founder_nova,
            action: AuditLog.ACTIONS.INQUIRY_STATUS_CHANGED,
            resourceType: "InvestorInquiry",
            resourceId: ids.inquiries.inq_nova_meera,
            previousStatus: "meeting_scheduled",
            newStatus: "due_diligence",
            reason: `${DEMO_AUDIT_MARKER} Demo pipeline update`,
        },
    ];
    await AuditLog.insertMany(auditRecords);

    console.log("\nVentureDesk demo data seeded successfully.");
    console.log(`MongoDB database: ${mongoose.connection.name}`);
    console.log(`Users: ${usersData.length} (5 founders, 4 investors, 1 admin)`);
    console.log(`Startups: ${startupsData.length}`);
    console.log(`Opportunities: ${opportunitiesData.length} (approved, pending_review, changes_requested, rejected, draft)`);
    console.log(`Investor inquiries: ${inquiryData.length}`);
    console.log(`Demo audit records: ${auditRecords.length}`);
    console.log("\nDemo login password for all seeded users: " + DEMO_PASSWORD);
    console.log("Use these emails to log in:");
    for (const user of usersData) {
        console.log(`  ${user.role.padEnd(8)} ${user.email}`);
    }
    console.log("\nThis script did not drop collections. Delete sampledatafeed.js after confirming the data.");
}

main()
    .catch((error) => {
        console.error("\nDemo data seeding failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => { });
    });