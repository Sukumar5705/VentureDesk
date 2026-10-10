# VentureDesk — UI Design Specification
## Pixel-conscious replication guide for the selected dashboard reference

**Purpose:** This document is the portable design source of truth for implementing VentureDesk’s frontend in any AI coding assistant, IDE, or development environment.

**Primary reference:** The user-provided TOOTA dashboard screenshot (1504 × 1128 px). Reproduce its *visual language and layout logic* for VentureDesk: dark left sidebar, very light grey rounded workspace, black/white pill controls, oversized clean headings, dense-but-spacious metric cards, soft multicolor gradient visualization, thin borders, subtle shadows, and pastel green–peach ambient background.

**Product context:** VentureDesk is a role-based startup discovery and management platform for founders, investors, and administrators. Keep the reference’s dashboard aesthetic while adapting labels, data, and navigation to actual VentureDesk features and backend contracts.

**Important:** This is a style-and-layout replication specification, not permission to copy the TOOTA name, logo, employee content, third-party logos, or unrelated metrics. Use VentureDesk branding and real VentureDesk data. Never hardcode fake production metrics.

---

# 1. Visual target

## 1.1 Overall look

The target screenshot has these defining characteristics:

- A wide, rounded application frame centered inside a soft pastel gradient canvas.
- A near-black sidebar occupying about 20% of the app frame.
- A pale cool-grey workspace occupying the remaining 80%.
- Large rounded outer corners, approximately 28–34 px at the reference size.
- Flat, high-contrast typography: black headings and labels, muted grey helper text.
- White cards with very subtle borders and restrained shadows.
- Pill-shaped segmented controls, date filters, search, and theme switch.
- A dashboard built from a primary analytics area, a narrow right-side ranking/list panel, and a bottom row of metric cards.
- One signature horizontal gradient bar and a multicolor vertical-bar chart.
- Small line icons with consistent stroke weight.
- Soft ambient green, cream, and peach outside the application frame.
- A calm, premium SaaS style: no excessive gradients, no heavy glass blur, no glowing neon, no unnecessary ornament.

## 1.2 Replicate the structure, adapt the content

Use this composition for VentureDesk’s authenticated dashboards. Replace the reference’s team-performance content with startup platform information.

Recommended mapping:
- “Summary” → Overview
- “Overview” → Dashboard / Platform Overview
- “Requests” → Startup Reviews or Inquiries, depending on role
- “Inventory” → Startups / Marketplace
- “Documents” → Startup Documents only if implemented
- “People & Roles” → Users / Team only where supported
- “Support” → Help or Support only if implemented

The right-hand “Best Performing Employees” panel becomes a role-relevant panel such as **Recently Submitted Startups**, **Featured Startups**, or **Review Queue**. The lower metric cards become real VentureDesk metrics.

---

# 2. Reference dimensions and proportions

The supplied reference image is 1504 × 1128 px. Treat the following as approximate proportions, not hard-coded values for every viewport.

## 2.1 Outer canvas

- Full viewport background: warm pastel gradient.
- Suggested gradient: pale mint at upper-left, warm peach at upper-right, pale sage/cream toward the lower area.
- Main app frame starts around 5.2% from the left and 7% from the top in the reference.
- Main frame width: about 83.2% of image width.
- Main frame height: about 78.2% of image height.
- Use responsive max-width and viewport padding rather than absolute positioning.
- At smaller widths, the frame should become a full-width app shell with sensible margins, not a scaled-down desktop screenshot.

## 2.2 Main application frame

- Desktop layout: sidebar + workspace.
- Sidebar: approximately 20–21% of frame width.
- Workspace: approximately 79–80%.
- Outer corner radius: 30 px at the reference scale.
- Clip inner content to the outer rounded frame.
- No thick border around the whole application.
- Main content panel is a cool light grey, not pure white.

Suggested desktop dimensions at a 1440 px viewport:
- App frame max width: 1360 px.
- Sidebar width: 270–290 px.
- Main content: remaining width.
- Workspace padding: 28–36 px.
- Outer frame min-height: calc(100vh - 96px), with a practical content-based height.

Do not lock the page to the reference image’s exact height. The app must scroll naturally when content exceeds the viewport.

## 2.3 Workspace grid

The primary dashboard uses a 12-column mental grid:
- Header/title row spans the full workspace.
- Controls sit on a row below the title.
- Primary analytics card takes roughly 70% of the content row.
- Secondary list/ranking panel takes roughly 28%, with a small gap.
- Metric cards sit in a four-column row on large desktop.
- Gaps are consistent, around 8–12 px between tightly related cards and 20–28 px between major sections.

---

# 3. Color system

The screenshot’s palette is dominated by charcoal, pale grey, white, black, and a small number of soft green/coral/yellow chart accents. Use these as the initial tokens; tune them visually in browser after implementation.

| Token | Suggested value | Usage |
|---|---|---|
| `--vd-sidebar` | `#171D20` | Sidebar background |
| `--vd-sidebar-muted` | `#2C3438` | Theme switch track and secondary dark surfaces |
| `--vd-workspace` | `#E9E9E9` | Main dashboard background |
| `--vd-card` | `#F8F8F8` | Primary card surface |
| `--vd-card-strong` | `#FFFFFF` | Search field, selected controls, nested panels |
| `--vd-text` | `#101416` | Primary text |
| `--vd-text-secondary` | `#707578` | Descriptions, metadata, helper text |
| `--vd-text-on-dark` | `#F7F8F8` | Sidebar text |
| `--vd-border` | `#FFFFFF` | Subtle white card borders on grey workspace |
| `--vd-border-muted` | `#E2E4E4` | Input borders and separators |
| `--vd-green` | `#65D995` | Positive metrics, success states, chart green |
| `--vd-green-soft` | `#A9F078` | Green chart gradient |
| `--vd-mint` | `#D8F1C5` | Soft decorative tint |
| `--vd-coral` | `#F59A9B` | Negative/low chart segment, sparingly |
| `--vd-peach` | `#FFB18F` | Gradient accent |
| `--vd-yellow` | `#F4D66F` | Middle gradient accent |
| `--vd-red` | `#D85A51` | Negative delta/status |
| `--vd-amber` | `#E8B64F` | Warning or middle chart segment |
| `--vd-blue` | `#88B6F5` | Optional secondary chart accent |

### Rules
- Black/charcoal is the primary anchor color.
- The selected navigation item is white with dark text.
- The selected pill is near-black with white text.
- Unselected pills are white or nearly white with dark text.
- Keep green/coral/yellow mostly for statuses, deltas, and visualizations.
- Do not introduce saturated purple/blue gradients unless required by a specific data visualization.
- Always pair status colors with text, an icon, or another non-color cue.

## 3.1 Outer background gradient

Use a subtle background behind the app frame:
```css
background:
  radial-gradient(ellipse at 8% 10%, rgba(188, 231, 174, 0.82), transparent 42%),
  radial-gradient(ellipse at 82% 8%, rgba(247, 207, 183, 0.82), transparent 42%),
  radial-gradient(ellipse at 62% 90%, rgba(208, 222, 153, 0.68), transparent 38%),
  #eee9df;
```
This is decorative only. Keep the actual app workspace solid and readable.

---

# 4. Typography

## 4.1 Font

Use a clean modern sans-serif matching the reference’s neutral, slightly geometric feel.

Preferred:
- **Inter** or **Manrope**.
- Use whichever is already installed and loaded correctly.
- Fallback: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

Avoid serif fonts, playful fonts, and very condensed fonts.

## 4.2 Typography scale

| Element | Desktop size | Weight | Notes |
|---|---:|---:|---|
| Page heading | 38–42 px | 650–750 | Tight line-height around 1.05 |
| Section heading | 20–22 px | 550–650 | “Teams”, “Metrics” equivalent |
| Primary metric | 38–44 px | 500–600 | Large, clean, no decorative styling |
| Card title | 13–15 px | 500–600 | Compact but readable |
| Sidebar item | 14–15 px | 450–550 | Keep labels legible |
| Body copy | 13–15 px | 400 | Short, muted descriptions |
| Metadata | 11–12 px | 400 | Use sparingly; maintain contrast |
| Status/delta | 11–13 px | 500–600 | Compact colored value with readable text |

- Use near-black text instead of pure black if it softens the interface.
- Headings are bold, not extra-heavy.
- Keep line-height tight for large headings and comfortable for descriptions.
- Avoid using text below 11 px for important information.

---

# 5. Shape, spacing, borders, and shadows

## 5.1 Radius

- Main app frame: 28–34 px.
- Workspace major cards: 24–30 px.
- Metric cards: 18–22 px.
- Search input: 999 px pill.
- Segmented controls: 999 px pill.
- Sidebar selected item: 999 px pill.
- Theme toggle: 999 px capsule.
- Small badges: 999 px pill.
- Nested chart panel: 10–14 px.

Use a consistent radius scale. Do not make every element a different radius.

## 5.2 Spacing

Use a 4 px base unit:
- 4 px: icon/text micro-gap.
- 8 px: tight label and control spacing.
- 12 px: card inner spacing for compact content.
- 16 px: standard component gap.
- 20–24 px: card padding.
- 24–32 px: major section spacing.
- 32–40 px: workspace edge padding on large screens.

The screenshot feels airy because spacing is consistent—not because every area is oversized.

## 5.3 Borders and shadows

- Cards have subtle white borders against the grey workspace.
- Use very soft shadows only where surfaces need separation.
- Avoid dark, high-opacity shadows.
- Avoid glowing shadows.
- Nested cards may use a faint inset border.
- Use thin separators rather than boxed outlines for every content group.

Suggested shadows:
```css
--shadow-card: 0 2px 8px rgba(18, 24, 26, 0.025);
--shadow-floating: 0 10px 30px rgba(18, 24, 26, 0.08);
```

## 5.4 Glassmorphism

The reference is primarily a soft, opaque dashboard—not a heavy glass UI. Keep glass effects restrained:
- Use translucency on the outer floating frame only if it remains visually subtle.
- Do not put blur on every card.
- The sidebar should remain solid charcoal.
- Cards and charts should remain mostly opaque for contrast.
- Any backdrop blur must have a solid fallback.

---

# 6. Icons

## 6.1 Style

- Use **Lucide** icons if already installed.
- Use outline icons with a consistent 1.7–2 px stroke.
- Standard sidebar icon: 18–20 px.
- Small action icon: 14–17 px.
- Header utility icon: 17–20 px.
- Align icons optically with text; use a consistent icon box.
- Do not mix filled emoji, outline icons, and unrelated icon packs.

## 6.2 Suggested icon mapping

| Destination/action | Lucide icon |
|---|---|
| Overview | `layout-dashboard` or `gauge` |
| Startup reviews | `clipboard-check` |
| Startups | `building-2` |
| Discover | `compass` |
| Inquiries/messages | `messages-square` |
| Documents | `file-text` |
| Users/team | `users` |
| Profile | `user-round` |
| Settings | `settings-2` |
| Support | `headset` |
| Search | `search` |
| Notifications | `bell` |
| Calendar/date filter | `calendar-days` |
| More actions | `ellipsis` |
| Theme/light | `sun` |
| Theme/dark | `moon` |
| View details | `arrow-up-right` or `chevron-right` |
| Positive change | `trending-up` |
| Negative change | `trending-down` |
| Success | `check-circle-2` |
| Warning | `alert-circle` |
| Error | `x-circle` |

Check the installed Lucide package/version for exact icon names. If a name is unavailable, use the closest existing icon—do not introduce another icon library solely for one icon.

---

# 7. Application shell

## 7.1 Desktop structure

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Outer pastel canvas                                                         │
│  ┌─────────────────────┬──────────────────────────────────────────────────┐ │
│  │ Dark sidebar        │ Light grey workspace                             │ │
│  │                     │ Header: title + subtitle       Search + avatar   │ │
│  │ VentureDesk logo    │                                                  │ │
│  │                     │ Segment controls            Date/filter pills   │ │
│  │ Overview            │                                                  │ │
│  │ Startups            │ Section heading                                  │ │
│  │ Reviews / Inquiries │ ┌──────────────────────────────┬───────────────┐ │ │
│  │ Documents*          │ │ Main analytics/content card  │ Side panel    │ │ │
│  │ People*             │ │ metric + gradient + chart    │ compact list  │ │ │
│  │ Support*            │ └──────────────────────────────┴───────────────┘ │ │
│  │                     │ Metrics                                           │ │
│  │                     │ ┌──────────┬──────────┬──────────┬──────────────┐ │ │
│  │ Theme switch        │ │ Metric 1 │ Metric 2 │ Metric 3 │ Metric 4     │ │ │
│  └─────────────────────┴─┴──────────┴──────────┴──────────┴──────────────┘ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
*Show only if the feature exists.
```

## 7.2 Sidebar

- Dark charcoal, full app-frame height.
- VentureDesk brand at the top: compact mark + wordmark.
- Vertical navigation with generous spacing.
- Inactive items: white/soft grey icon and label.
- Active item: white pill background, near-black icon and text.
- Sidebar bottom: optional theme switch, with “Light Mode” label as in the reference.
- On long pages, sidebar may remain sticky within the application shell.
- Do not force the sidebar to scroll separately unless needed.

### Sidebar spacing
- Horizontal padding: 18–22 px.
- Logo top spacing: 26–34 px.
- Navigation starts 28–36 px below the logo.
- Nav item height: 46–52 px.
- Item gap: 8–12 px.
- Active pill radius: full.
- Bottom theme control stays clear of the last navigation item.

### Theme switch
- Recreate the reference’s dark capsule with two choices: sun and moon.
- The selected mode sits inside a white capsule.
- Implement only if both themes are properly supported. If dark theme is out of scope, omit the switch rather than displaying a nonfunctional control.
- Persist preference only using the project’s established storage approach; never store sensitive data there.

## 7.3 Workspace

- Light grey canvas.
- Workspace top padding: 24–32 px.
- Title on the left, search and user avatar on the right.
- The next row contains role-specific tabs/segmented controls and filters.
- Major sections separated by 20–28 px.
- Use responsive grid, not absolute coordinates.

## 7.4 Top bar

- Left: page title and short subtitle.
- Right: rounded search field, notifications icon if implemented, user avatar/menu.
- Search width: approximately 200–260 px on desktop.
- Avatar: 40–46 px with a subtle online indicator only if online status is real.
- On mobile, condense search to an icon or place it below the title; never squeeze all desktop controls into a tiny row.

---

# 8. VentureDesk dashboard content by role

Keep the shell and styling consistent, but adapt information architecture and data to each role.

## 8.1 Founder dashboard

### Header
- Heading: “Overview” or “Your startup overview”.
- Subtitle: “Track your startup submissions and review progress.”
- Right side: search/profile controls if useful.
- Main action: “Submit startup”.

### Primary section
Left large card:
- Title: “Submission overview” or “Startup activity”.
- Large metric: total startups owned, if returned by the API.
- Small positive/neutral status text based on real data.
- Horizontal gradient progress bar only if it represents a meaningful, explainable value.
- Chart only if historical submission data exists.

Right narrow card:
- “Recent submissions” or “Review status”.
- List recent startup names and their actual statuses.
- Use compact logos/initial avatars and status labels.

### Bottom metric cards
Possible cards, only with actual API data:
- Total Startups
- Pending Review
- Approved
- Changes Requested / Rejected

Each card:
- Small label top-left.
- Small relevant icon top-right.
- Large value.
- Optional delta only if there is a valid comparison period.
- Subtext only if meaningful.
- Thin progress line only if it represents a defined percentage.

### Empty state
If the founder has no startups:
- Show a clear “Your first startup starts here” message.
- Add “Submit startup” CTA.
- Do not show zero-value charts as if they were analytics.

## 8.2 Investor dashboard / discovery

### Header
- Heading: “Explore Startups”.
- Subtitle: “Discover companies building across industries.”
- Search field at upper-right or directly above the listing grid.

### Filter row
- Industry/sector.
- Stage.
- Funding range only if backend currency and funding semantics are clear.
- Location if supported.
- Sort selector only if supported.
- Use white pill controls with thin borders and subtle selected states.

### Main content
- Main area: startup discovery cards or a compact list.
- Optional narrow side panel: featured/ recently added startups, saved items, or inquiry status only if implemented.
- Keep the same rounded-card language as the reference.
- On wide desktop, 3 columns for startup cards may be used; on smaller widths, 2 then 1.

### Startup cards
- White surface, 18–22 px radius.
- Top image or logo zone with consistent aspect ratio.
- Sector chip.
- Startup name in bold.
- Short description, clamped to 2 lines.
- Stage and location as muted metadata.
- Funding target with currency only if available.
- Bottom action: “View startup” or a clear arrow.
- Save button only if save functionality exists.
- Avoid fake logos and fabricated investor endorsements.

## 8.3 Admin dashboard

### Header
- Heading: “Overview”.
- Subtitle: “Review startup activity across VentureDesk.”
- Search and date-range controls only if functional and supported.

### Main analytics card
- Heading: “Startup submissions”.
- Large total submissions metric.
- Optional percentage approved only when correctly calculated from real API data.
- A horizontal multicolor bar may visualize status distribution.
- Chart of submissions over time only when historical data is available.

### Right panel
- “Needs review” / “Recent submissions”.
- Compact list of startup name, submission date, and status.
- Prioritize pending review.

### Bottom metric cards
- Total Startups
- Pending Review
- Approved
- Rejected / Changes Requested

### Admin behavior
- Review actions should be easy to find but not trigger accidentally.
- Use a confirmation dialog for consequential actions.
- After approve/reject/request-change, refresh server data and show server-confirmed feedback.
- Do not rely on hidden navigation or disabled buttons for security; backend permissions are mandatory.

## 8.4 Public landing page

The screenshot is a dashboard reference. The public landing page should use the same design language without copying the dashboard shell.

- Pale gradient canvas.
- Minimal top navbar.
- Strong dark heading.
- White/grey content cards with rounded corners.
- One or two carefully placed glass floating cards.
- Featured startups as white cards.
- Primary dark pill CTA and secondary light pill CTA.
- Keep the hero concise and product-focused.
- No fabricated platform statistics, testimonials, or logos.

Suggested hero:
- Eyebrow: “Connect ideas with capital”
- Heading: “Discover the next generation of startups.”
- Description: “Explore startup opportunities and follow the journey from founder submission to investor discovery.”
- Primary CTA: “Explore startups”
- Secondary CTA: “Join as a founder”

Use only copy that accurately describes implemented product behavior.

---

# 9. Card specifications

## 9.1 Main feature/analytics card

- Background: near-white.
- Radius: 24–28 px.
- Padding: 22–28 px.
- Header line: metric title/label and a small green status value aligned right.
- Large number: 38–44 px.
- Supporting label: 11–12 px muted grey.
- Gradient meter: 46–50 px high, pill-shaped.
- Chart zone below: white/very light surface, subtle inner border, radius 10–14 px.
- Use chart labels sparingly.
- On tablet/mobile, stack or simplify chart labels rather than shrinking text excessively.

## 9.2 Right-side list card

- Background: white.
- Radius: 24–28 px.
- Padding: 18–22 px.
- Heading: 14–16 px semibold.
- Rows: avatar/logo, title and supporting label, optional status/value aligned right.
- Row height: around 42–52 px.
- Avoid too many rows; 4–6 items is a reasonable desktop target.
- On mobile, place below the main card or turn into a horizontal/vertical list.

## 9.3 Metric card

- Background: white/near-white.
- Radius: 18–22 px.
- Padding: 18–22 px.
- Top row: metric label + small icon.
- Main number: 36–42 px on large desktop; 28–34 px on smaller screens.
- Delta badge: compact, green for positive and red for negative only when the delta is valid and the meaning is clear.
- Footer: muted change explanation and thin progress bar only if meaningful.
- Equal-height cards in a row.
- On mobile, do not force four tiny columns; stack into 1–2 columns.

## 9.4 Pills and segmented controls

- Full pill radius.
- Height: 42–48 px for primary filters.
- Selected: near-black background and white text.
- Unselected: white background and near-black text.
- Thin subtle border if needed.
- Hover: slight background/border change; avoid large animations.
- Keyboard focus: visible outline.
- Do not use segmented controls for mutually exclusive choices unless the interaction is real.

## 9.5 Search field

- Pill-shaped white field.
- Search icon at left.
- Muted placeholder.
- Height: 46–50 px.
- Border subtle enough not to dominate.
- Clear affordance when query is non-empty.
- Accessible label even if a placeholder is present.

---

# 10. Charts and gradient visualization

The reference uses two signature visual elements. Recreate their visual character only where the data makes sense.

## 10.1 Gradient meter

A long rounded horizontal bar with a warm-to-green gradient:
```css
background: linear-gradient(
  90deg,
  #F59A9B 0%,
  #FFC66F 26%,
  #DCEB70 54%,
  #9BF16D 78%,
  #7AEF6B 100%
);
```

- Height: 46–50 px desktop.
- Fully rounded ends.
- Optional dark vertical marker at the measured position.
- Label inside on the left and a separate value on the right when space allows.
- The bar’s fill must represent a defined metric. If no meaningful metric exists, do not display it as a fake progress indicator.

## 10.2 Multicolor vertical bar chart

- Thin vertical bars, 2–4 px wide, with 2–3 px gaps.
- Use a coral → peach → yellow → green progression across bars.
- Chart container is near-white with a subtle border.
- Avoid gridline clutter.
- Use meaningful axis labels and accessible text.
- On small screens, simplify or horizontally scroll the chart; never force tiny unreadable labels.
- Use actual historical data only.

Example CSS colors:
```css
background: linear-gradient(
  180deg,
  #A2F17B 0%,
  #F5D16F 55%,
  #F29A98 100%
);
```
For individual bars, calculate a color from the data point or use a fixed, deliberate sequence if the chart is purely illustrative in a clearly marked demo environment.

---

# 11. Responsive and smooth behavior

The screenshot is desktop-first, but VentureDesk must be fully responsive. Preserve the design’s visual hierarchy, not its exact desktop dimensions.

## 11.1 Breakpoints

Suggested breakpoints:
- Mobile: `< 640px`
- Tablet: `640px–1023px`
- Desktop: `1024px–1439px`
- Large desktop: `1440px+`

Use existing Tailwind breakpoints if Tailwind is already configured. Avoid maintaining two competing breakpoint systems.

## 11.2 Desktop

- Full dark sidebar.
- Workspace and sidebar share a single rounded application frame.
- Primary analytics card and right-side list appear side-by-side.
- Four metric cards in a row when they fit comfortably.
- Header title/subtitle left; search/profile right.

## 11.3 Tablet

- Sidebar may collapse to icon rail or drawer.
- Main and right-side panels may move to a 2-column layout only if both remain readable.
- Metrics become two columns.
- Filter pills wrap naturally.
- Tables can scroll horizontally inside their own container.

## 11.4 Mobile

- App frame fills the viewport with little/no outer canvas visible.
- Sidebar becomes a drawer or compact bottom navigation.
- Header controls wrap into multiple rows.
- Main and side cards stack vertically.
- Metrics use two columns only when each card remains at least roughly 145–160 px wide; otherwise one column.
- Search and filters occupy available width.
- Startup cards stack into one column.
- Forms are single-column.
- Dialogs fit inside viewport with scrollable content.
- Touch targets aim for 44 × 44 px.
- No horizontal overflow at 320 px width.

## 11.5 Smoothness and animation

Use restrained motion:
- Hover/focus transition: 140–180 ms.
- Drawer/dialog transition: 180–240 ms.
- Small card hover lift: no more than 2 px.
- Avoid animating layout properties that cause jank.
- Avoid parallax and continuous animated gradients.
- Respect `prefers-reduced-motion`.
- Do not delay access to important content with entrance animations.

## 11.6 Responsive QA widths

Check at:
- 320 px
- 375 px
- 640 px
- 768 px
- 1024 px
- 1280 px
- 1440 px
- 1504 px

---

# 12. States and interaction details

Every visible control must have a real behavior.

## Navigation
- Active route uses the white pill style.
- Links route to existing pages.
- Unknown paths show a useful 404.
- Mobile navigation can be opened and closed by keyboard and pointer.

## Search and filters
- Search must query real data or a real loaded dataset.
- Filters must map to supported API parameters/data fields.
- Clear filters resets the result state.
- Use debouncing where useful.
- Avoid fake filter controls that do nothing.

## Forms
- Visible labels; placeholders are supplementary.
- Inline validation errors.
- Disable submit while pending.
- Preserve entered values after recoverable errors.
- Display success only after server confirmation.

## Loading
- Use soft grey skeletons that match the final card shapes.
- Avoid a full-screen spinner for ordinary list loading.
- Keep layout stable to reduce content shift.

## Empty state
- Brief explanation.
- Clear next action if available.
- Do not render fake analytics when the dataset is empty.

## Error state
- Plain-language message.
- Retry action when appropriate.
- Do not expose stack traces or sensitive server errors.

## Status badges
- Compact pills.
- Use readable status text: Pending Review, Approved, Rejected, Changes Requested, etc., only if these match the actual backend status enum.
- Pair color with text/icon.
- Use green for success, amber for pending/warning, red for rejection/error, neutral grey for unknown.

---

# 13. Accessibility and usability

- Semantic HTML throughout.
- Every input has a programmatic label.
- All interactions are keyboard accessible.
- Visible focus styles are mandatory.
- Maintain WCAG AA contrast as far as practical.
- Never rely on color alone to convey state.
- Use accessible names for icon-only controls.
- Meaningful images have alt text; decorative images use empty alt text.
- Charts include a summary or accessible labels.
- Dialogs manage focus and close appropriately.
- Respect reduced-motion settings.
- Avoid tiny text and overly faint grey labels.
- Ensure the active sidebar item is distinguishable without relying solely on color.

---

# 14. Technical implementation guidance

This is a design document, not a mandate to replace the existing architecture.

Before implementing:
1. Inspect the existing frontend and backend.
2. Identify the router, styling setup, installed dependencies, auth strategy, and API response shapes.
3. Confirm user roles and backend permissions.
4. Confirm the actual startup status enum and fields.
5. Reuse existing components and services where possible.
6. Build only the screens supported by current backend functionality.
7. Do not modify backend contracts merely to match a mockup without documenting why.

## Suggested implementation choices

Use existing project choices first. If not already established:
- React + Vite.
- Tailwind CSS for responsive utility styling.
- Lucide React for consistent outline icons.
- Existing router (React Router or current project router).
- Existing API client/service layer.
- Existing chart library only if charting is backed by real data.

Avoid adding dependencies for features that can be implemented simply with existing tools.

## Suggested component structure

Adapt to the current repository instead of restructuring blindly:
```text
src/
  app/
    App.jsx
    router.jsx
  components/
    ui/
      Button.jsx
      Input.jsx
      Select.jsx
      StatusBadge.jsx
      MetricCard.jsx
      SearchField.jsx
      Skeleton.jsx
      EmptyState.jsx
      ErrorState.jsx
    layout/
      AppShell.jsx
      Sidebar.jsx
      Topbar.jsx
      PublicNavbar.jsx
    startup/
      StartupCard.jsx
      StartupFilters.jsx
      StartupList.jsx
      StartupDetailHeader.jsx
    dashboard/
      DashboardSection.jsx
      ActivityList.jsx
      ReviewQueue.jsx
  pages/
    public/
      LandingPage.jsx
      StartupDiscoveryPage.jsx
      StartupDetailPage.jsx
    auth/
      LoginPage.jsx
      RegisterPage.jsx
    founder/
      FounderDashboardPage.jsx
      FounderStartupsPage.jsx
      StartupSubmissionPage.jsx
    investor/
      InvestorDashboardPage.jsx
    admin/
      AdminDashboardPage.jsx
      StartupReviewsPage.jsx
  services/
    api.js
  styles/
    tokens.css
    globals.css
```

This is illustrative. Keep the actual project structure if it is already clean and functional.

---

# 15. Suggested route map

Adapt to the router and API capabilities already present.

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page |
| `/startups` | Public | Approved startup discovery |
| `/startups/:id` | Public if visible | Startup details |
| `/login` | Public | Sign in |
| `/register` | Public | Registration |
| `/founder/dashboard` | Founder | Founder overview |
| `/founder/startups` | Founder | Manage own startups |
| `/founder/startups/new` | Founder | Submit startup |
| `/investor/dashboard` | Investor | Discovery overview if needed |
| `/admin/dashboard` | Admin | Platform overview |
| `/admin/reviews` | Admin | Review queue |
| `/admin/reviews/:id` | Admin | Review detail |
| `/profile` | Authenticated | User profile |
| `*` | Public | Not-found page |

Do not add routes for unsupported features simply because they appear in this document.

---

# 16. Data integrity and security

- Backend and repository contracts are the source of truth.
- Never invent endpoints, response fields, or status names.
- Never hardcode sample metrics as real platform metrics.
- Public users should only see startups permitted by the backend visibility rules.
- Founders may only manage their own records unless the backend explicitly allows otherwise.
- Admin operations must be authorized by the server.
- Hiding a button is not security.
- Respect the existing JWT/cookie/session design.
- Do not store passwords or sensitive profile data in browser storage.
- Do not log tokens.
- Handle 401, 403, 404, validation errors, rate limits, and server errors.
- Keep private admin notes out of public pages.
- Avoid fake online indicators, fake user ratings, and fake activity feeds.

---

# 17. Definition of done

- [ ] The application shell matches the reference’s proportions, dark sidebar, pale workspace, rounded frame, and visual hierarchy.
- [ ] Typography, icon family, radii, spacing, and status colors are consistent.
- [ ] Selected sidebar item is a white pill with dark text.
- [ ] Controls use the white/black pill treatment.
- [ ] Cards have subtle borders and restrained shadows.
- [ ] Gradient meter and bar-chart style are used only when meaningful.
- [ ] The public landing page and startup marketplace follow the same design language.
- [ ] Founder and admin dashboards display real data.
- [ ] Investor features are only shown if supported.
- [ ] Every visible control works.
- [ ] Loading, empty, error, and success states are handled.
- [ ] Responsive layouts work at 320–1504 px.
- [ ] Keyboard navigation, labels, focus styles, and contrast are checked.
- [ ] No fake metrics or unauthorized private data appear.
- [ ] Existing tests and production build pass, or pre-existing failures are documented.
- [ ] No unnecessary backend changes or dependency additions were made.

---

# 18. Reusable prompt for an AI coding assistant

Paste this document together with the following prompt:

> You are a senior frontend engineer and product UI specialist. Read `design.md` completely and inspect the existing repository before editing anything. Recreate the supplied dashboard reference’s visual style for VentureDesk: charcoal sidebar, light grey rounded workspace, large clean sans-serif heading, white selected navigation pill, white/black pill controls, rounded white cards, restrained shadows, soft pastel green/peach outer gradient, and a subtle coral-to-yellow-to-green visualization accent.
>
> Adapt the content to VentureDesk’s actual founder, investor, and admin workflows. Do not copy the TOOTA brand, its text, employee data, or unrelated metrics. Use VentureDesk branding and real backend data only.
>
> First audit the current project: framework, file structure, routes, installed dependencies, styling system, auth/session approach, API endpoints, response shapes, roles, permissions, and existing tests. Report what is already implemented and what is missing before making changes.
>
> Then implement the smallest coherent frontend slice. Reuse existing code, avoid unnecessary files and dependencies, and do not rewrite the backend to fit the design. Do not invent endpoints, fields, status enums, metrics, or functionality. Every visible control must work or be omitted.
>
> Keep the UI responsive, accessible, and smooth. Preserve the reference’s visual hierarchy without using fixed desktop dimensions on mobile. Include loading, empty, error, and success states. After implementation, run relevant tests and a production build, report exact files changed and results, and identify any remaining gaps.

---

# 19. Final design rule

**Replicate the reference’s layout rhythm and visual discipline, not just its colors.** The defining details are the dark left rail, oversized clean heading, selected white navigation pill, restrained black-and-white controls, light grey workspace, rounded cards, compact data rows, generous alignment, and a single controlled pastel gradient accent. Consistency and working product flows are more important than decorative effects.
