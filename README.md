# VentureDesk

### 1. Project Description

VentureDesk is a MERN-stack (MongoDB, Express, React, Node.js) application that connects three user roles around one controlled startup-fundraising workflow:

- **Founders** describe their startup and package a funding request as an *opportunity*.
- **Admins** review each submitted opportunity and approve it, reject it, or send it back with feedback.
- **Investors** browse only the approved opportunities and send an inquiry, which the founder then moves through a simple deal pipeline.

Early-stage fundraising has two recurring problems: investors see listings of uneven quality, and founders get little structured feedback. VentureDesk addresses both by putting a review step between a founder's draft and the investor-facing catalogue. When a founder submits an opportunity, the server stores a snapshot of the startup's details alongside it, so investors always see exactly what the admin reviewed — even if the founder edits their profile later. Ownership and identity are always derived server-side from the authenticated session, never from fields the client sends.

---

### 2. Features

**Authentication & accounts**
- Registration (founder or investor), login, logout, session restore on page load.
- JWT in an `HttpOnly` cookie, bcrypt password hashing (cost 12), role-based route guards and API checks.

**Founder workspace**
- Dashboard with live opportunity/inquiry counts.
- One startup profile per founder (create, view, edit).
- Opportunity drafts (create, edit, list) with a completeness check before submission.

**Admin review**
- Review queue (pending opportunities) with a detail view.
- Three decisions — approve, request changes, reject — with a mandatory note for the last two.
- Atomic status transitions that guard against two admins reviewing the same item at once.

**Opportunity discovery**
- Public catalogue of approved opportunities with search, industry, stage, location, and funding-range filters, sorting, and pagination.
- Public responses are built only from the reviewed snapshot, never internal fields.

**Investor inquiries**
- Investors send one inquiry per approved opportunity (duplicates blocked at the database level).
- Founders see and advance inquiries through a pipeline: `new → contacted → meeting_scheduled → due_diligence → closed_won | closed_lost`.
- Investors can withdraw their own inquiry.

**Security & validation**
- Zod schemas (strict mode — unknown fields rejected) on every request.
- `helmet`, an exact-match CORS allow-list, request body size limits, and rate limiting.

---

### 3. Technologies Used

**Frontend (`client/`)**
- React 19 + TypeScript, Vite (dev server/bundler)
- React Router (client-side routing and role guards)
- CSS Modules + CSS custom properties for styling (no Tailwind)
- `lucide-react` for icons, Oxlint for linting

**Backend (`server/`)**
- Node.js (CommonJS) + Express 5 — REST API
- MongoDB + Mongoose — database, schemas, validation, queries
- Zod — request body/query validation
- `jsonwebtoken`, `bcryptjs`, `cookie-parser` — authentication
- `helmet`, `cors`, `express-rate-limit` — security middleware

---

### 4. Setup and Installation Instructions

**Prerequisites:** Node.js `^20.19.0` or `>=22.12.0`, npm, a MongoDB connection string (Atlas or local), Git.

```bash
git clone https://github.com/<your-username>/VentureDesk.git
cd VentureDesk

# Backend
cd server
npm install
cp .env.example .env

# Frontend
cd ../client
npm install
```

**Configure `server/.env`:**
- `MONGODB_URI` — your MongoDB connection string.
- `JWT_SECRET` — a long random value (generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
- `CLIENT_ORIGIN` — leave as `http://localhost:5173` unless the frontend port changes.

The frontend calls `http://localhost:5000` by default; set `VITE_API_URL` in `client/.env` if your API runs elsewhere.

---

### 5. How to Run the Application

Run the API and the web app as two separate processes.

**Terminal 1 — API**
```bash
cd server
npm run dev
```
Confirm it's up: `curl http://localhost:5000/api/health`

**Terminal 2 — Frontend**
```bash
cd client
npm run dev
```
Open the URL Vite prints (default `http://localhost:5173`).

**Optional demo data:**
```bash
cd server
node src/scripts/sampledatafeed.js
```

---

### 6. AI Development Tool Used

**Kiro** was used as the primary AI-assisted development tool for this project. The repository includes its spec files under `.kiro/specs/venturedesk-frontend/`.

---

### 7. AI Development Experience

The application was built through an AI-assisted workflow starting in Kiro, which generated the core frontend and backend structure, REST API routes, authentication flows, database integration, and the frontend-backend connection. Kiro's output was treated as a first draft — every generated piece was reviewed, tested, and corrected rather than accepted as-is. My role throughout was directing the build, evaluating what Kiro produced, tracking down and fixing issues, and validating the result against the app's actual requirements. This process reinforced my understanding of MERN architecture, authentication, REST API design, database integration, validation, and debugging, along with the importance of being able to explain the codebase independently rather than treating it as a black box.

---

### 8. Specific Tasks Where the AI Tool Was Used

1. **Full-stack implementation** — building the core React frontend and Node.js/Express backend, establishing the project structure, and implementing the main application workflows (founder → admin review → investor discovery).
2. **Authentication & API development** — implementing and reviewing auth controllers, Express routes, request validation, and protected endpoints.
3. **Database integration** — building the MongoDB/Mongoose data-access layer, including the five models and their relationships (`User`, `Startup`, `Opportunity`, `InvestorInquiry`, `AuditLog`).
4. **Debugging** — investigating and fixing a Zod v4 validation error-handling issue, and correcting smoke-test stubs that didn't properly support Mongoose-style query chaining.
5. **Testing** — generating and refining the offline smoke-test scripts (`server/src/scripts/smokeTest*.js`) that verify authentication, startup, opportunity, and inquiry behavior without needing a live database.

---

**Author:** Sukumar
**License:** No license file is included; no license is granted by default.
