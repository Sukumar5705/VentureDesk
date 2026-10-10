# Requirements Document

## Introduction

VentureDesk is a role-based startup discovery and investment pipeline management platform. The frontend must provide a complete, production-quality single-page application that connects founders, investors, and administrators through a shared API already built in Node.js + Express + MongoDB. The application consists of public-facing pages for startup discovery, role-gated authenticated dashboards for each user type, and a design system matching a dark-sidebar shell with pastel gradient background as described in the design reference. The implementation uses React + Vite + JavaScript with CSS custom properties for design tokens, HTTP-only cookie authentication, and real API data throughout — no hardcoded metrics or placeholder content.

---

## Glossary

- **App_Shell**: The root layout component — pastel radial gradient background, rounded outer frame, dark charcoal left Sidebar (~20 % width), and light grey Workspace (~80 % width).
- **Sidebar**: The left navigation panel rendered inside the App_Shell for authenticated sessions. Contains the VentureDesk logo, role-specific navigation links, and a user avatar/logout control.
- **Workspace**: The right content area inside the App_Shell where page content is rendered.
- **API_Client**: The shared fetch wrapper used by every page. Sends `credentials: 'include'` on all requests and surfaces structured API errors.
- **Auth_Context**: The React context that stores the authenticated user object (`id`, `fullName`, `email`, `role`, `createdAt`) and exposes `login`, `logout`, and `refreshUser` actions.
- **Route_Guard**: A React component that reads Auth_Context and redirects unauthenticated visitors to `/login` or mis-roled visitors to their correct dashboard.
- **Skeleton**: An animated placeholder element rendered in place of content while a network request is in flight.
- **Toast**: A transient, accessible notification element used for success, error, and warning feedback.
- **Opportunity_Card**: A reusable card component that displays an approved opportunity's title, startup name, industry badge, stage badge, funding amount, and location.
- **Inquiry_Pipeline**: The visual representation of an investor's inquiry state machine: `new → contacted → meeting_scheduled → due_diligence → closed_won | closed_lost`.
- **Review_Queue**: The admin interface listing opportunities in `pending_review` status.
- **Design_Tokens**: CSS custom properties (`--color-*`, `--radius-*`, `--shadow-*`, `--font-*`) defined in a single `:root` block and consumed by all components.
- **Founder**: A registered user with `role: "founder"`. Can manage one startup profile and multiple funding opportunities.
- **Investor**: A registered user with `role: "investor"`. Can browse approved opportunities and manage an inquiry pipeline.
- **Admin**: A registered user with `role: "admin"`. Can review, approve, reject, or request changes on submitted opportunities.

---

## Requirements

### Requirement 1: Design System and App Shell

**User Story:** As any user, I want a consistent, visually polished interface so that the application feels professional and trustworthy.

#### Acceptance Criteria

1. THE App_Shell SHALL render a radial gradient background using the pastel mint, peach, and cream Design_Tokens as gradient stops, visible behind the outer frame at all viewport sizes.
2. THE App_Shell SHALL render an outer frame with a border-radius of at least 24px containing the Sidebar and Workspace arranged side by side in a single row.
3. THE Sidebar SHALL occupy between 18% and 22% of the total App_Shell width and use a background color that achieves a contrast ratio of at least 4.5:1 against white text as measured by the WCAG AA contrast formula.
4. THE Workspace SHALL occupy between 78% and 82% of the total App_Shell width and use a background color that achieves a contrast ratio of at least 4.5:1 against the primary body text color as measured by the WCAG AA contrast formula.
5. THE App_Shell SHALL define Design_Tokens for color, typography, border-radius, box-shadow, and spacing as CSS custom properties in a single CSS `:root` block, where the typography token specifies Inter as the first font-family choice and Manrope as the fallback.
6. WHEN the viewport width is below 768px, THE App_Shell SHALL hide the Sidebar and render a top navigation bar or a slide-in drawer that exposes all Sidebar navigation links, ensuring every link is reachable within two taps.
7. WHEN the viewport width is between 768px and 1504px inclusive, THE App_Shell SHALL maintain the Sidebar and Workspace side-by-side layout, with the Sidebar between 18% and 22% of App_Shell width and the Workspace taking the remaining width.
8. THE App_Shell SHALL render all content without a horizontal scrollbar at any viewport width between 320px and 1504px inclusive.
9. THE App_Shell SHALL use Lucide React outline icons exclusively for all iconography, with no filled or custom icon variants rendered anywhere in the interface.
10. WHEN a focusable interactive element receives keyboard focus, THE App_Shell SHALL render a visible focus ring with a minimum outline width of 2px and a contrast ratio of at least 3:1 between the focus ring color and the adjacent background color, per WCAG AA.
11. THE App_Shell SHALL use semantic HTML elements — specifically `<nav>` for navigation regions, `<main>` for primary content, `<header>` for page or section headers, `<section>` for thematic groupings, and `<article>` for self-contained content blocks — throughout all page structures.

---

### Requirement 2: Authentication — Registration

**User Story:** As a new user, I want to register with my name, email, password, and role so that I can access the platform with the correct permissions.

#### Acceptance Criteria

1. THE Registration_Page SHALL be accessible at the `/register` route without authentication.
2. THE Registration_Page SHALL render fields for `fullName` (max 100 characters), `email`, `password` (min 8, max 128 characters), and a `role` selector with exactly two choices: `founder` and `investor`.
3. WHEN the user submits the registration form with all valid fields, THE Registration_Page SHALL call `POST /api/auth/register` with `credentials: 'include'`.
4. WHEN `POST /api/auth/register` returns HTTP 201, THE Registration_Page SHALL redirect the user to their role-appropriate dashboard (`/founder/dashboard` for founders, `/investor/dashboard` for investors).
5. WHEN `POST /api/auth/register` returns HTTP 409 (email already registered), THE Registration_Page SHALL display the message "Email is already registered" inline beneath the email field.
6. WHEN `POST /api/auth/register` returns HTTP 400 (validation error), THE Registration_Page SHALL display each field-level error message beneath the corresponding input.
7. WHILE the registration request is in flight, THE Registration_Page SHALL disable the submit button and display a visible spinner within the submit button.
8. THE Registration_Page SHALL not expose an `admin` role option in the role selector.
9. IF the user is already authenticated, THEN THE Registration_Page SHALL redirect to the user's role-appropriate dashboard without rendering the form.
10. THE Registration_Page SHALL enforce client-side validation: `fullName` is non-empty, `email` matches the pattern `^[^\s@]+@[^\s@]+\.[^\s@]+$`, `password` is at least 8 and at most 128 characters, and `role` is selected before the form may be submitted.
11. WHEN `POST /api/auth/register` returns any status other than 201, 400, or 409, THE Registration_Page SHALL display a generic error Toast and re-enable the submit button.

---

### Requirement 3: Authentication — Login

**User Story:** As a registered user, I want to log in with my email and password so that I can access my dashboard.

#### Acceptance Criteria

1. THE Login_Page SHALL be accessible at the `/login` route without authentication.
2. THE Login_Page SHALL render fields for `email` and `password`.
3. THE Login_Page SHALL enforce client-side validation: `email` is non-empty and matches a valid email pattern, and `password` is non-empty before the form may be submitted.
4. WHEN the user submits the login form with valid credentials, THE Login_Page SHALL call `POST /api/auth/login` with `credentials: 'include'`.
5. WHEN `POST /api/auth/login` returns HTTP 200, THE Login_Page SHALL call `GET /api/auth/me` to populate Auth_Context and then redirect to the user's role-appropriate dashboard (`/founder/dashboard`, `/investor/dashboard`, or `/admin/dashboard`).
6. WHEN `POST /api/auth/login` returns HTTP 401, THE Login_Page SHALL display the message "Invalid email or password" as a form-level error without indicating which field is incorrect.
7. WHEN `POST /api/auth/login` returns HTTP 400, THE Login_Page SHALL display each field-level validation error message beneath the corresponding input.
8. WHILE the login request is in flight, THE Login_Page SHALL disable the submit button and display a loading indicator.
9. IF the user is already authenticated, THEN THE Login_Page SHALL redirect to the user's role-appropriate dashboard without rendering the form.
10. WHEN `GET /api/auth/me` fails after a successful `POST /api/auth/login` HTTP 200 response, THE Login_Page SHALL display an error Toast with message "Login succeeded but session could not be loaded. Please try again." and remain on the login page.

---

### Requirement 4: Authentication — Session Management and Logout

**User Story:** As an authenticated user, I want my session to be maintained across page refreshes and to log out securely so that my account is protected.

#### Acceptance Criteria

1. WHEN the application loads, THE Auth_Context SHALL call `GET /api/auth/me` with `credentials: 'include'` to restore the session from the existing HTTP-only cookie.
2. WHILE Auth_Context is resolving the initial `GET /api/auth/me` call, THE Auth_Context SHALL expose a `loading: true` state that prevents any route rendering.
3. WHEN `GET /api/auth/me` returns HTTP 200, THE Auth_Context SHALL store the returned user object and set `loading: false`.
4. WHEN `GET /api/auth/me` returns HTTP 401, THE Auth_Context SHALL store `null` as the user and set `loading: false`.
5. WHEN the user clicks "Logout", THE Auth_Context SHALL call `POST /api/auth/logout` with `credentials: 'include'`.
6. WHEN `POST /api/auth/logout` returns HTTP 200, THE Auth_Context SHALL set the stored user to `null` and redirect to `/`.
7. WHEN `POST /api/auth/logout` returns a non-200 response, THE Auth_Context SHALL set the stored user to `null`, redirect to `/`, and display an error Toast.
8. THE Auth_Context SHALL never store the JWT token in `localStorage`, `sessionStorage`, or any JavaScript-accessible variable.
9. WHEN any API_Client request (other than the logout request itself) returns HTTP 401 and the stored user is non-null, THE Auth_Context SHALL set the stored user to `null` and redirect to `/login`.

---

### Requirement 5: Route Guards and Navigation

**User Story:** As a platform user, I want to be redirected to the correct page when I try to access a page I am not allowed to see so that I am never shown a blank or broken screen.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to any `/founder/*`, `/investor/*`, `/admin/*`, or `/profile` route, THE Route_Guard SHALL redirect to `/login` without rendering the requested page content.
2. WHILE Auth_Context is in its loading state, THE Route_Guard SHALL render a full-page loading indicator and SHALL NOT evaluate any redirect rules until `loading` is `false`.
3. WHEN an authenticated Founder navigates to an `/investor/*` or `/admin/*` route, THE Route_Guard SHALL redirect to `/founder/dashboard`.
4. WHEN an authenticated Investor navigates to a `/founder/*` or `/admin/*` route, THE Route_Guard SHALL redirect to `/investor/dashboard`.
5. WHEN an authenticated Admin navigates to a `/founder/*` or `/investor/*` route, THE Route_Guard SHALL redirect to `/admin/dashboard`.
6. WHEN a user navigates to a path that does not match any defined route, THE App_Shell SHALL render a 404 page with a link back to `/`.
7. WHILE a Founder is authenticated, THE Sidebar SHALL render the following navigation links: Overview (`/founder/dashboard`), Startups (`/founder/startups`), Opportunities (`/founder/opportunities`), Inquiries (`/founder/inquiries`), and Profile (`/profile`).
8. WHILE an Investor is authenticated, THE Sidebar SHALL render the following navigation links: Dashboard (`/investor/dashboard`), Discover (`/startups`), My Inquiries (within `/investor/dashboard`), and Profile (`/profile`).
9. WHILE an Admin is authenticated, THE Sidebar SHALL render the following navigation links: Overview (`/admin/dashboard`), Reviews (`/admin/reviews`), and Profile (`/profile`).
10. WHEN the current URL matches or is prefixed by a Sidebar link's route, THE Sidebar SHALL render that link in a visually distinguished active state different from all other links (white pill indicator with dark text).

---

### Requirement 6: Public Landing Page

**User Story:** As a visitor, I want to see a compelling landing page so that I understand what VentureDesk offers before registering.

#### Acceptance Criteria

1. THE Landing_Page SHALL be accessible at the `/` route without authentication.
2. THE Landing_Page SHALL display a hero section with the VentureDesk name, a value proposition of no more than 120 characters, a primary CTA linking to `/register`, and a secondary CTA linking to `/startups`.
3. THE Landing_Page SHALL display a section summarising the three user roles — each role section SHALL name the role and list at least one named capability available to that role on the platform.
4. WHEN a user is authenticated, THE Landing_Page SHALL display a link to the user's role-appropriate dashboard (`/founder/dashboard`, `/investor/dashboard`, or `/admin/dashboard`) in place of the primary "Register" CTA, and the "Register" link in the navigation header SHALL be hidden.
5. THE Landing_Page SHALL include a navigation header with a link to `/login`. The "Register" link SHALL only be visible when the user is not authenticated.

---

### Requirement 7: Public Startup Discovery Marketplace

**User Story:** As a visitor or investor, I want to browse approved startup opportunities so that I can find investment opportunities that match my criteria.

#### Acceptance Criteria

1. THE Discovery_Page SHALL be accessible at the `/startups` route without authentication.
2. WHEN the Discovery_Page loads, THE Discovery_Page SHALL call `GET /api/opportunities` and render Opportunity_Cards for each returned result, where each card displays: opportunity title, startup name, industry badge, stage badge, `fundingRequired` formatted in INR, and location.
3. WHILE the initial `GET /api/opportunities` request is in flight, THE Discovery_Page SHALL render Skeleton elements in place of Opportunity_Cards.
4. THE Discovery_Page SHALL render a search input (max 100 characters) that, when the user stops typing for 400 ms (debounced), re-fetches `GET /api/opportunities?search={term}`.
5. THE Discovery_Page SHALL render filter controls for `industry`, `stage`, and `location` that append the corresponding query parameters to the `GET /api/opportunities` call when changed.
6. THE Discovery_Page SHALL render sort controls for `sortBy` (`publishedAt`, `fundingRequired`, `title`) and `order` (`asc`, `desc`) that update the `GET /api/opportunities` query when changed.
7. THE Discovery_Page SHALL render pagination controls driven by the `pagination` object in the API response, defaulting to 10 items per page, and SHALL disable the "previous" control on page 1 and the "next" control on the last page.
8. WHEN the API returns an empty result set, THE Discovery_Page SHALL display an empty state message indicating no matching opportunities were found.
9. WHEN the API request fails, THE Discovery_Page SHALL display an error state with a retry button that re-executes the most recent request.
10. WHEN any user (authenticated or not) clicks an Opportunity_Card, THE Discovery_Page SHALL navigate to `/startups/{id}`.

---

### Requirement 8: Public Opportunity Detail Page

**User Story:** As a visitor or investor, I want to view the full details of a startup opportunity so that I can decide whether to submit an inquiry.

#### Acceptance Criteria

1. THE Opportunity_Detail_Page SHALL be accessible at the `/startups/:id` route without authentication.
2. WHEN the Opportunity_Detail_Page loads, THE Opportunity_Detail_Page SHALL call `GET /api/opportunities/:id` and display: `title`, `stage`, `fundingRequired` (formatted in INR with crore/lakh labels), `description`, `useOfFunds`, `publishedAt`, and the startup snapshot fields (`name`, `description`, `industry`, `location`, `website`).
3. WHEN `GET /api/opportunities/:id` returns HTTP 404, THE Opportunity_Detail_Page SHALL display a 404 message with a link back to `/startups`.
4. WHEN `GET /api/opportunities/:id` returns a non-404 error (500 or network failure), THE Opportunity_Detail_Page SHALL display an error state with a retry button.
5. WHEN an unauthenticated visitor views the page, THE Opportunity_Detail_Page SHALL render an "Express Interest" button that, when clicked, navigates to `/login`.
6. WHEN an authenticated Investor views the page and the API response does not include an existing inquiry from this investor, THE Opportunity_Detail_Page SHALL render an "Express Interest" button that opens an inline inquiry form with a `message` textarea (min 1, max 1000 characters).
7. WHEN the Investor submits the inquiry form with a valid message, THE Opportunity_Detail_Page SHALL call `POST /api/opportunities/:id/inquiries` with `credentials: 'include'`.
8. WHEN `POST /api/opportunities/:id/inquiries` returns HTTP 201, THE Opportunity_Detail_Page SHALL hide the inquiry form and display a success Toast.
9. WHEN `POST /api/opportunities/:id/inquiries` returns HTTP 409, THE Opportunity_Detail_Page SHALL display the message "You have already sent an inquiry for this opportunity" and hide the form.
10. WHEN the investor submits the inquiry form with an empty or oversized message, THE Opportunity_Detail_Page SHALL display an inline validation error and SHALL NOT call the API.
11. WHEN a Founder or Admin views the page, THE Opportunity_Detail_Page SHALL not render the "Express Interest" button.

---

### Requirement 9: Founder Dashboard

**User Story:** As a founder, I want to see an at-a-glance summary of my startup's opportunities and investor activity so that I can manage my fundraising pipeline.

#### Acceptance Criteria

1. THE Founder_Dashboard SHALL be accessible at the `/founder/dashboard` route and protected by Route_Guard (founder role required).
2. WHEN the Founder_Dashboard loads, THE Founder_Dashboard SHALL call `GET /api/startups/me`, `GET /api/opportunities/mine`, and `GET /api/startups/me/inquiries` in parallel.
3. WHILE any of the three data requests is in flight, THE Founder_Dashboard SHALL render Skeleton cards in place of metric cards and list rows; once all three requests settle, THE Founder_Dashboard SHALL replace Skeleton cards with actual content or error states.
4. THE Founder_Dashboard SHALL display the following real-data metric cards using only values derived from the API responses:
   a. Total opportunities (count of results from `GET /api/opportunities/mine`).
   b. Opportunities by status breakdown (draft, pending_review, changes_requested, approved, rejected).
   c. Total inquiries received (count from `GET /api/startups/me/inquiries`).
   d. Inquiries by status breakdown (new, contacted, meeting_scheduled, due_diligence, closed_won, closed_lost).
5. WHEN `GET /api/startups/me` returns HTTP 404, THE Founder_Dashboard SHALL display a prompt card (and SHALL NOT render the startup metric cards) inviting the founder to create their startup profile with a link to `/founder/startups/new`.
6. WHEN `GET /api/opportunities/mine` returns an empty array, THE Founder_Dashboard SHALL display an empty state prompt to create the first opportunity with a link to `/founder/opportunities/new`.
7. THE Founder_Dashboard SHALL display a recent inquiries list (latest 5 entries from `GET /api/startups/me/inquiries`) showing investor name, linked opportunity title, status badge, and a human-relative timestamp (e.g. "3 days ago" for dates within 365 days, otherwise `YYYY-MM-DD`).
8. WHEN any individual API request fails, THE Founder_Dashboard SHALL display an inline error message for the affected card only, with a retry control that re-executes only that failed request, leaving other cards unaffected.

---

### Requirement 10: Founder Startup Profile Management

**User Story:** As a founder, I want to create and update my startup's profile so that investors can see accurate information about my company when I submit an opportunity.

#### Acceptance Criteria

1. THE Startup_Profile_Page SHALL be accessible at the `/founder/startups` route (founder role required).
2. WHEN the Startup_Profile_Page loads, THE Startup_Profile_Page SHALL call `GET /api/startups/me`.
3. WHEN `GET /api/startups/me` returns HTTP 200, THE Startup_Profile_Page SHALL render a pre-filled form with `name`, `description`, `industry`, `location`, and `website`.
4. WHEN `GET /api/startups/me` returns HTTP 404, THE Startup_Profile_Page SHALL redirect to `/founder/startups/new`.
5. THE Startup_New_Page SHALL be accessible at `/founder/startups/new` (founder role required) and render a blank creation form with `name`, `description`, `industry`, `location`, and `website` fields.
6. WHEN the user submits the creation form, THE Startup_New_Page SHALL call `POST /api/startups` with `credentials: 'include'`.
7. WHEN `POST /api/startups` returns HTTP 201, THE Startup_New_Page SHALL display a success Toast and redirect to `/founder/startups`.
8. WHEN `POST /api/startups` returns HTTP 409 (startup already exists for this founder), THE Startup_New_Page SHALL display an inline error message and navigate the user to `/founder/startups` where the existing profile can be edited.
9. WHEN the user submits an update to an existing profile, THE Startup_Profile_Page SHALL call `PATCH /api/startups/me` with `credentials: 'include'`.
10. WHEN `PATCH /api/startups/me` returns HTTP 200, THE Startup_Profile_Page SHALL display a success Toast and update the displayed values in place.
11. THE industry selector on both the Startup_New_Page and Startup_Profile_Page SHALL render exactly the following values: `ai_ml`, `agritech`, `climate_energy`, `cybersecurity`, `ecommerce`, `edtech`, `fintech`, `healthtech`, `logistics`, `real_estate`, `saas`, `consumer`, `other`.
12. WHEN `POST /api/startups` or `PATCH /api/startups/me` returns HTTP 400, THE form SHALL display field-level validation error messages beside each invalid field.
13. WHEN `POST /api/startups` or `PATCH /api/startups/me` returns a non-201/200/400/409 status, THE form SHALL display a generic error Toast.
14. WHILE a save request is in flight, THE form SHALL disable the submit button and display a loading indicator.

---

### Requirement 11: Founder Opportunity Management

**User Story:** As a founder, I want to create, edit, and submit funding opportunities so that investors can discover and inquire about my startup.

#### Acceptance Criteria

1. THE Opportunities_Page SHALL be accessible at `/founder/opportunities` (founder role required) and list all opportunities returned by `GET /api/opportunities/mine`.
2. WHILE the request is in flight, THE Opportunities_Page SHALL render Skeleton rows; WHEN the response is an empty array, THE Opportunities_Page SHALL display an empty state prompt; WHEN the request fails, THE Opportunities_Page SHALL display an error state with a retry control.
3. WHEN the founder clicks "New Opportunity", THE Opportunities_Page SHALL navigate to `/founder/opportunities/new`.
4. WHEN `POST /api/opportunities` returns HTTP 201, THE App_Shell SHALL display a success Toast and navigate to `/founder/opportunities/:id/edit`.
5. WHEN the founder clicks "Edit" on a `draft` or `changes_requested` opportunity, THE App_Shell SHALL navigate to `/founder/opportunities/:id/edit` pre-filled with the opportunity data.
6. WHEN `PATCH /api/opportunities/:id` returns HTTP 200, THE App_Shell SHALL display a success Toast.
7. WHEN `PATCH /api/opportunities/:id` returns a non-200 response, THE App_Shell SHALL display an error Toast with the API error message.
8. WHEN the founder clicks "Submit for Review" and all required fields (`stage`, `fundingRequired`, `description`, `useOfFunds`) are present, THE App_Shell SHALL call `POST /api/opportunities/:id/submit` with `credentials: 'include'`.
9. WHEN the "Submit for Review" button is visible and required fields are absent, THE Opportunities_Page SHALL render the button in a disabled state with an accessible `aria-label` describing why it is disabled.
10. WHEN `POST /api/opportunities/:id/submit` returns HTTP 200, THE Opportunities_Page SHALL update the opportunity's status badge to `pending_review` and display a success Toast.
11. WHEN `POST /api/opportunities/:id/submit` returns HTTP 400 (incomplete fields), THE App_Shell SHALL display the list of missing fields in an error Toast.
12. WHEN `POST /api/opportunities/:id/submit` returns a non-200/400 status, THE App_Shell SHALL display a generic error Toast.
13. WHEN an opportunity has status `pending_review`, `approved`, or `rejected`, THE Opportunities_Page SHALL render the "Edit" and "Submit" controls as disabled with accessible `aria-label` attributes for each.
14. WHEN an opportunity has status `changes_requested`, THE Opportunities_Page SHALL render an inline banner showing the `reviewNote` returned by the API.
15. THE Opportunities_Page SHALL render a status badge for each opportunity: `draft` (grey), `pending_review` (amber), `changes_requested` (orange), `approved` (green), `rejected` (red). WHEN an unrecognised status value is received, THE badge SHALL render in neutral grey with the raw status string.
16. WHEN `POST /api/opportunities` returns HTTP 404 (no startup profile), THE App_Shell SHALL display an error Toast with a link to `/founder/startups/new`.

---

### Requirement 12: Investor Dashboard

**User Story:** As an investor, I want to see an overview of my inquiry pipeline so that I can track deals at every stage.

#### Acceptance Criteria

1. THE Investor_Dashboard SHALL be accessible at the `/investor/dashboard` route (investor role required). WHEN a non-investor authenticated user navigates to this route, THE Route_Guard SHALL redirect to their role-appropriate dashboard.
2. WHEN the Investor_Dashboard loads, THE Investor_Dashboard SHALL call `GET /api/inquiries/mine` with `credentials: 'include'`.
3. WHILE the request is in flight, THE Investor_Dashboard SHALL render exactly two Skeleton cards in place of the metric cards and a Skeleton list in place of the pipeline rows.
4. THE Investor_Dashboard SHALL display the following real-data metric cards:
   a. Total inquiries submitted (integer count of API results).
   b. Pipeline breakdown: a horizontal segmented bar or list showing counts for each status (new, contacted, meeting_scheduled, due_diligence, closed_won, closed_lost) derived from the API response.
5. THE Investor_Dashboard SHALL render a pipeline list where each row shows: opportunity title, startup name, industry, stage, `fundingRequired` formatted in INR (no decimals), current status badge, and last-updated timestamp formatted as a relative label (within 365 days) or `YYYY-MM-DD` (older).
6. WHEN the Investor_Dashboard inquiry list is empty, THE Investor_Dashboard SHALL display an empty state message with a link to `/startups`.
7. WHEN `GET /api/inquiries/mine` fails, THE Investor_Dashboard SHALL display an inline error message and a retry control that re-executes `GET /api/inquiries/mine`.

---

### Requirement 13: Investor Inquiry Pipeline Management

**User Story:** As an investor, I want to manage my inquiry pipeline and close out deals so that I can keep my activity tracker accurate.

#### Acceptance Criteria

1. THE Investor_Dashboard inquiry list SHALL render a "Withdraw" button on each inquiry row whose status is `new`, `contacted`, `meeting_scheduled`, or `due_diligence`.
2. WHEN the investor clicks "Withdraw", THE Investor_Dashboard SHALL call `PATCH /api/inquiries/:id/status` with body `{ "status": "closed_lost" }` and `credentials: 'include'`.
3. WHEN `PATCH /api/inquiries/:id/status` returns HTTP 200, THE Investor_Dashboard SHALL update the inquiry row's status badge to `closed_lost`, remove the "Withdraw" button from that row, and display a success Toast.
4. WHEN `PATCH /api/inquiries/:id/status` returns HTTP 409 (invalid transition), THE Investor_Dashboard SHALL display an error Toast containing the API error message and SHALL NOT modify the row's displayed status.
5. WHEN `PATCH /api/inquiries/:id/status` returns any non-200/409 status, THE Investor_Dashboard SHALL display a generic error Toast and SHALL NOT modify the row's displayed status.
6. THE Investor_Dashboard SHALL not render any status-change control on inquiry rows in `closed_won` or `closed_lost` status.
7. THE Investor_Dashboard SHALL render status badges using distinct colours: `new` (neutral grey), `contacted` (blue), `meeting_scheduled` (amber), `due_diligence` (purple), `closed_won` (green), `closed_lost` (red).

---

### Requirement 14: Founder Inquiry Pipeline View

**User Story:** As a founder, I want to view and advance investor inquiries so that I can manage my fundraising relationships.

#### Acceptance Criteria

1. THE Founder_Inquiries_Page SHALL be accessible at `/founder/inquiries` (founder role required) and call `GET /api/startups/me/inquiries` on load.
2. THE Founder_Inquiries_Page SHALL render a list of inquiries showing: investor name, linked opportunity title, message preview (first 100 characters), current status badge, `nextStep` value if non-empty, and last-updated timestamp as a localized date and time string.
3. WHILE the request is in flight, THE Founder_Inquiries_Page SHALL render Skeleton rows.
4. WHEN the founder clicks on an inquiry row, THE Founder_Inquiries_Page SHALL expand that row inline to show the full inquiry message and all fields; WHEN the founder clicks the expanded row again, THE Founder_Inquiries_Page SHALL collapse it.
5. FOR each inquiry in a non-terminal status, THE Founder_Inquiries_Page SHALL render status-advance controls for the permitted transitions: `new → contacted`, `contacted → meeting_scheduled`, `meeting_scheduled → due_diligence`, `due_diligence → closed_won`, and `any non-terminal → closed_lost`.
6. FOR inquiries in `closed_won` or `closed_lost` status, THE Founder_Inquiries_Page SHALL render no status-advance controls.
7. WHEN the founder clicks a status-advance control, THE Founder_Inquiries_Page SHALL call `PATCH /api/inquiries/:id/status` with the new status and an optional `nextStep` string (max 200 characters).
8. WHEN `PATCH /api/inquiries/:id/status` returns HTTP 200, THE Founder_Inquiries_Page SHALL update the inquiry row's status badge in place and display a success Toast.
9. WHEN `PATCH /api/inquiries/:id/status` returns a non-200 response, THE Founder_Inquiries_Page SHALL display an error Toast and preserve the inquiry's current displayed status.
10. IF `GET /api/startups/me` returns HTTP 404 (no startup profile), THEN THE Founder_Inquiries_Page SHALL display an empty state with a prompt to create the startup profile at `/founder/startups/new`.
11. WHEN `GET /api/startups/me/inquiries` returns an empty array, THE Founder_Inquiries_Page SHALL display an empty state message indicating no inquiries have been received yet (distinct from the no-profile empty state).
12. THE Founder_Inquiries_Page SHALL support filtering inquiries by status via a pill-segment filter control that re-fetches `GET /api/startups/me/inquiries?status={value}` when a filter is selected.

---

### Requirement 15: Admin Dashboard and Review Queue

**User Story:** As an admin, I want to see all submitted opportunities and take review actions so that I can keep the marketplace accurate and high quality.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL be accessible at `/admin/dashboard` (admin role required). WHEN a non-admin navigates to this route, THE Route_Guard SHALL redirect to `/unauthorized` or the user's role-appropriate dashboard.
2. WHEN the Admin_Dashboard loads, THE Admin_Dashboard SHALL call `GET /api/admin/opportunities?status=pending_review`.
3. THE Admin_Dashboard SHALL display a metric card showing the integer count of opportunities in the API response.
4. THE Admin_Reviews_Page SHALL be accessible at `/admin/reviews` (admin role required) and also enforce non-admin redirect.
5. WHEN the Admin_Reviews_Page loads, THE Admin_Reviews_Page SHALL call `GET /api/admin/opportunities?status=pending_review` and render the result list.
6. THE Admin_Reviews_Page SHALL include a status filter control allowing the admin to switch between `pending_review`, `approved`, `changes_requested`, and `rejected`; each selection SHALL re-fetch `GET /api/admin/opportunities?status={value}`.
7. WHILE any `GET /api/admin/opportunities` request is in flight, THE Admin_Reviews_Page SHALL render Skeleton rows.
8. WHEN `GET /api/admin/opportunities` returns a non-2xx response, THE Admin_Reviews_Page SHALL display an error message and a retry control.
9. WHEN the admin clicks on an opportunity row, THE Admin_Reviews_Page SHALL navigate to `/admin/reviews/:id`.
10. THE Admin_Review_Detail_Page SHALL be accessible at `/admin/reviews/:id` (admin role required) and call `GET /api/admin/opportunities/:id` on load.
11. THE Admin_Review_Detail_Page SHALL display: `title`, `stage`, `fundingRequired` (INR formatted, no decimals), `description`, `useOfFunds`, `submittedAt` (formatted as `DD MMM YYYY`), and the startup snapshot fields: startup name, sector, founding year, team size, and website URL.
12. WHEN the opportunity has `status: "pending_review"`, THE Admin_Review_Detail_Page SHALL render three action buttons: "Approve", "Request Changes", and "Reject".
13. WHEN the admin clicks "Approve", THE Admin_Review_Detail_Page SHALL call `PATCH /api/admin/opportunities/:id/review` with `{ "decision": "approved" }`.
14. WHEN the admin clicks "Request Changes" or "Reject", THE Admin_Review_Detail_Page SHALL require the admin to enter a `reviewNote` between 1 and 1000 characters before the action button becomes enabled.
15. WHEN `PATCH /api/admin/opportunities/:id/review` returns HTTP 200, THE Admin_Review_Detail_Page SHALL display a success Toast (visible for at least 3 seconds), update the opportunity's status badge, and disable the three review action buttons.
16. WHEN `PATCH /api/admin/opportunities/:id/review` returns HTTP 409 (already reviewed), THE Admin_Review_Detail_Page SHALL display an error Toast with the API message.
17. WHEN `GET /api/admin/opportunities/:id` returns HTTP 404, THE Admin_Review_Detail_Page SHALL display a 404 message with a link back to `/admin/reviews`.

---

### Requirement 16: Shared Profile Page

**User Story:** As any authenticated user, I want to view my account information so that I can verify my registration details.

#### Acceptance Criteria

1. IF an unauthenticated user navigates to `/profile`, THEN THE Profile_Page SHALL redirect the user to `/login`.
2. WHILE the user is authenticated, THE Profile_Page SHALL be accessible at `/profile`.
3. WHEN the Profile_Page loads, THE Profile_Page SHALL display the `fullName`, `email`, `role`, and `createdAt` fields sourced from Auth_Context, where `createdAt` is formatted as `YYYY-MM-DD`.
4. WHILE Auth_Context data is loading, THE Profile_Page SHALL display a loading indicator and SHALL NOT render the profile fields.
5. THE Profile_Page SHALL render a "Logout" button that, when clicked, triggers the logout flow defined in Requirement 4.
6. THE Profile_Page SHALL not include an edit-profile form in this release (profile editing is out of scope).

---

### Requirement 17: API Client and Error Handling

**User Story:** As a developer, I want a consistent API client layer so that authentication, error parsing, and loading states are handled uniformly across all pages.

#### Acceptance Criteria

1. THE API_Client SHALL be a shared JavaScript module that wraps `fetch` and always passes `credentials: 'include'` and `Content-Type: application/json` headers on every request.
2. WHEN the API_Client receives a response with HTTP status outside 200–299, THE API_Client SHALL throw a structured error object containing `status`, `message`, and `details` fields parsed from the response body.
3. WHEN the API_Client receives HTTP 401, THE API_Client SHALL emit a session-expired event that Auth_Context listens to, sets the stored user to `null`, and redirects to `/login`.
4. WHEN the API_Client receives HTTP 429, THE API_Client SHALL display a Toast with message "Too many requests, please try again later" that auto-dismisses after 4 seconds.
5. WHEN the API_Client receives HTTP 500 or any non-2xx status not handled by criteria 3 or 4, THE API_Client SHALL display a Toast with message "Something went wrong, please try again" that auto-dismisses after 4 seconds.
6. WHEN the `fetch` call rejects (network failure) or the response body is not valid JSON, THE API_Client SHALL throw a structured error with `message: "Network error, please check your connection"` and display that message in an error Toast.
7. THE API_Client SHALL not store the JWT token in any JavaScript variable, log it to the console, or include it in any response payload.

---

### Requirement 18: Loading, Empty, and Error States

**User Story:** As any user, I want clear visual feedback whenever content is loading, missing, or unavailable so that I am never confused about the application state.

#### Acceptance Criteria

1. WHILE Auth_Context is resolving the initial `GET /api/auth/me` call, THE App_Shell SHALL render a full-page loading indicator blocking all interaction.
2. WHILE any list page makes its initial data fetch, THE App_Shell SHALL render Skeleton elements in place of list rows or cards.
3. WHEN any data fetch fails and no cached data is available, THE App_Shell SHALL render an error state component in place of the page content area containing a message describing the failed operation and a "Retry" button that re-executes the failed request.
4. WHEN any list page returns an empty result set, THE App_Shell SHALL render an empty state component with a heading and body text distinct to that list page and, where applicable, a call-to-action to create the first item.
5. WHEN a form is submitted and the request is in flight, THE App_Shell SHALL disable the primary submit button and display an inline spinner; once the request settles (success or failure), THE App_Shell SHALL re-enable the button and hide the spinner.
6. THE Toast notification system SHALL use green as the background accent for success Toasts, red for error Toasts, and amber for warning Toasts.
7. THE Toast notification system SHALL auto-dismiss Toasts after 5 seconds and provide a manual close button.
8. THE Toast notification system SHALL render Toasts with `role="alert"` and `aria-live="assertive"` so they are announced by screen readers.

---

### Requirement 19: Routing and Navigation Structure

**User Story:** As any user, I want consistent, bookmarkable URLs so that I can navigate directly to any page and use the browser back/forward buttons.

#### Acceptance Criteria

1. THE App_Shell SHALL use React Router v6 for client-side routing.
2. THE App_Shell SHALL define the following public routes: `/` (Landing_Page), `/startups` (Discovery_Page), `/startups/:id` (Opportunity_Detail_Page), `/login` (Login_Page), `/register` (Registration_Page).
3. IF an authenticated user navigates to `/login` or `/register`, THEN THE Route_Guard SHALL redirect to the user's role-appropriate dashboard.
4. THE App_Shell SHALL define the following founder routes (all protected by Route_Guard with founder role): `/founder/dashboard`, `/founder/startups`, `/founder/startups/new`, `/founder/opportunities`, `/founder/opportunities/new`, `/founder/opportunities/:id/edit`, `/founder/inquiries`.
5. THE App_Shell SHALL define the following investor routes (all protected by Route_Guard with investor role): `/investor/dashboard`.
6. THE App_Shell SHALL define the following admin routes (all protected by Route_Guard with admin role): `/admin/dashboard`, `/admin/reviews`, `/admin/reviews/:id`.
7. THE App_Shell SHALL define the shared route `/profile` accessible to all authenticated roles and protected by Route_Guard (any authenticated user).
8. THE App_Shell SHALL define a catch-all `*` route that renders a 404 page with a link to `/`.
9. WHEN the user uses the browser back button, THE App_Shell SHALL navigate to the previous route in the history stack without triggering a full page reload.

---

### Requirement 20: Accessibility and Internationalisation Baseline

**User Story:** As a user with assistive technology, I want the application to be keyboard-navigable and screen-reader friendly so that I can use all features without a mouse.

#### Acceptance Criteria

1. THE App_Shell SHALL achieve WCAG 2.1 AA colour contrast: a minimum ratio of 4.5:1 for normal-weight text smaller than 18pt, and 3:1 for large text (18pt+ or 14pt+ bold) and UI components.
2. WHEN any interactive element receives keyboard focus, THE App_Shell SHALL render a visible focus indicator with a contrast ratio of at least 3:1 between the indicator color and the adjacent background.
3. THE App_Shell SHALL render a descriptive `aria-label` attribute (1–100 characters describing the action, not the icon appearance) on every icon-only button.
4. THE App_Shell SHALL render a non-empty `<label>` element visible in the DOM and associated via `htmlFor`/`id` with every form input.
5. WHEN a modal or dialog is open, THE App_Shell SHALL constrain Tab and Shift+Tab focus cycling to elements within the modal; WHEN the modal closes, focus SHALL return to the element that triggered it.
6. WHEN a modal opens and contains no naturally focusable elements, THE App_Shell SHALL move focus to the modal container element (with `tabIndex="-1"`).
7. THE App_Shell SHALL format INR amounts as: values ≥ 1,00,00,000 displayed with a "Cr" suffix (e.g. "₹2.5 Cr"), values ≥ 1,00,000 and < 1,00,00,000 displayed with an "L" suffix (e.g. "₹50 L"), and values below 1,00,000 displayed with full digits; dates within the last 365 days SHALL be displayed as a relative label (e.g. "3 days ago") and older dates as `YYYY-MM-DD`.
8. THE App_Shell SHALL render the application in English; no internationalisation library is required in this release.
