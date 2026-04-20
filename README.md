# CKCS Survey Results Dashboard

A pivot-table-style analytics dashboard for CKCS survey data, pulled live from Airtable. Built with Next.js 14 App Router, TypeScript, and Tailwind CSS. Embedded inside a Softr portal via iframe; also accessible as a stand-alone admin tool.

---

## Quick Start

```bash
git clone <repo-url>
cd CKCSSurveyResults

cp .env.example .env.local
# Fill in AIRTABLE_API_KEY and AIRTABLE_BASE_ID

npm install
npm run dev
# → http://localhost:3000  (redirects to /dashboard)
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `AIRTABLE_API_KEY` | ✅ | — | Personal Access Token (starts with `pat`) |
| `AIRTABLE_BASE_ID` | ✅ | — | Base ID from the Airtable URL (starts with `app`) |
| `AIRTABLE_TABLE_RESPONDENTS` | | `tblE1rwPUjtxodIvZ` | Override table ID |
| `AIRTABLE_TABLE_ITEMS` | | `tbl9lguOzNO8VjMvY` | Override table ID |
| `AIRTABLE_TABLE_COMMENTS` | | `tbla8CWwKDBuQwmtq` | Override table ID |

The PAT needs **read** access to the base only.

---

## Project Structure

```
CKCSSurveyResults/
├── public/
│   ├── loading.lottie                  — Loading animation (played in Softr embed + app)
│   └── noun-compiler-8277230-17345B.svg — Logo mark (navy)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  — Root layout: HTML shell + body brand background
│   │   ├── page.tsx                    — Redirects / → /dashboard
│   │   ├── globals.css                 — Tailwind + brand CSS custom properties
│   │   │
│   │   ├── dashboard/                  — Softr embed route
│   │   │   ├── layout.tsx              — Embed layout: no header, minimal padding
│   │   │   ├── page.tsx                — Server Component: resolves user permissions, passes to client
│   │   │   └── DashboardClient.tsx     — Client Component: all filter/results state + UI
│   │   │
│   │   ├── admin_access/               — Direct browser access route (full permissions)
│   │   │   ├── layout.tsx              — Admin layout: AppHeader + main wrapper
│   │   │   └── page.tsx                — Server Component: loads dashboard without user restrictions
│   │   │
│   │   ├── admin/debug/
│   │   │   └── page.tsx                — Airtable diagnostics + User Permissions Lookup
│   │   │
│   │   └── api/
│   │       ├── filters/route.ts        — GET  → FilterOptions + SchoolInfo[]
│   │       ├── items/route.ts          — GET  → SurveyItem[]
│   │       ├── results/route.ts        — POST → AgreementRow[] | TopNRow[]
│   │       ├── comments/route.ts       — POST → CommentRow[]
│   │       ├── comparison/route.ts     — POST → ComparisonRow[] (school vs benchmarks)
│   │       └── history/route.ts        — POST → HistoryRow[] (two-administration comparison)
│   │
│   ├── components/
│   │   ├── AppHeader.tsx               — Brand nav bar (used on /admin_access only)
│   │   ├── LoadingOverlay.tsx          — Lottie animation overlay (shown during data fetches)
│   │   ├── SchoolMultiSelect.tsx       — Grouped school picker with region checkboxes
│   │   ├── MultiSelect.tsx             — Reusable checkbox dropdown
│   │   ├── FilterBar.tsx               — Horizontal slicer row
│   │   ├── TabToggle.tsx               — Mode switcher (Table / Charts / History / Open Responses)
│   │   ├── ResultsTable.tsx            — Sortable striped table with group headers
│   │   ├── ChartPanel.tsx              — Stacked bar charts with Print-to-PDF
│   │   └── DownloadButton.tsx          — CSV export trigger
│   │
│   └── lib/
│       ├── types.ts                    — All TypeScript interfaces
│       ├── airtable.ts                 — Airtable SDK client + field constants + fetch helpers
│       ├── filters.ts                  — getFilterOptions(), filterRespondents(), getSchoolOptions()
│       ├── items.ts                    — getSurveyItems(), getItemMap(), getItemMapById()
│       ├── aggregation.ts              — aggregateAgreement(), aggregateTopN(), buildComparisonRows()
│       ├── comments.ts                 — getComments() with item prompt join
│       ├── csv.ts                      — toCsv() (RFC 4180, UTF-8 BOM for Excel)
│       └── loadDashboard.ts            — Shared data-fetch entry points for both page routes
│
└── Reference/
    ├── softr-embed.txt                 — Softr custom code block (copy into Softr page editor)
    ├── Schema_Registry-*.csv           — Airtable field registry
    └── Softr_Chart_Style_Reference.rtf — Brand color reference
```

---

## Routes

### `/dashboard` — Softr Embed
The primary route, loaded inside a Softr iframe. Key characteristics:
- **No app header** — Softr provides its own navigation
- **User context applied** — school picker and available data are scoped to the logged-in user's permissions (resolved from Airtable `Users_Sync` via the `userEmail` URL param)
- Served via `dashboard/layout.tsx` (no AppHeader)

### `/admin_access` — Direct Admin Access
Identical dashboard experience but with full permissions and the brand AppHeader visible. Use this for direct browser access, testing, or admin workflows outside of Softr.
- All schools visible in the picker
- All comparison groups enabled
- User Context debug panel visible (no Softr user context)
- Served via `admin_access/layout.tsx` (with AppHeader)

### `/admin/debug` — Airtable Diagnostics
Verifies Airtable connectivity and field mappings. Includes a **User Permissions Lookup** section:
```
/admin/debug?testEmail=user@example.com
```
Shows the fully resolved `accountType`, `assignedSchools`, and `assignedRegions` for any email in `Users_Sync`.

### Keeping Routes in Sync
Both `/dashboard` and `/admin_access` import the same `DashboardClient` component and load data via `src/lib/loadDashboard.ts`:
- `loadEmbedDashboard(searchParams)` — resolves UserContext from Airtable, used by `/dashboard`
- `loadAdminDashboard()` — no user context, used by `/admin_access`

Any changes to data fetching or DashboardClient logic apply to both routes automatically.

---

## Softr Integration

### How It Works

The Softr page embeds the dashboard inside an `<iframe>`. A custom code block in Softr:
1. Reads logged-in user fields via `{LOGGED_IN_USER:field}` tokens (rendered server-side by Softr)
2. Shows a loading animation (lottie) outside the iframe while it loads
3. Builds the iframe `src` URL with user context as query params
4. Hides the loading animation and reveals the iframe when `load` fires

The Next.js app picks up the `userEmail` param, looks up the user in Airtable's `Users_Sync` table, and scopes the school picker and data to their permissions.

### Softr Custom Code Block

Copy the full snippet from `Reference/softr-embed.txt` into your Softr page's **Custom Code** block.

Key structure:
```html
<!-- 1. Hidden spans — Softr fills these server-side -->
<span id="ckcs-user-email" style="display:none">{LOGGED_IN_USER:email}</span>
<span id="ckcs-user-account-type" style="display:none">{LOGGED_IN_USER:Account_Type}</span>
<span id="ckcs-user-assigned-schools" style="display:none">{LOGGED_IN_USER:Assigned_Schools}</span>
<span id="ckcs-user-assigned-regions" style="display:none">{LOGGED_IN_USER:Assigned_Regions}</span>

<!-- 2. Loading animation (outside iframe — plays while iframe loads) -->
<div id="ckcs-loading">
  <canvas id="ckcs-lottie-canvas"></canvas>
</div>

<!-- 3. Iframe (hidden until loaded) -->
<iframe id="ckcs-dashboard" style="display:none"></iframe>

<script type="module">
  import { DotLottie } from 'https://esm.sh/@lottiefiles/dotlottie-web@0.35.0';
  // starts lottie → sets iframe.src → on 'load': hides animation, shows iframe
</script>
```

The loading animation plays from `https://ckcs-survey-results.vercel.app/loading.lottie` (served from the same Vercel deployment).

### User Context URL Params

| Param | Source | Used for |
|---|---|---|
| `userEmail` | `{LOGGED_IN_USER:email}` | Airtable Users_Sync lookup (authoritative) |
| `accountType` | `{LOGGED_IN_USER:Account_Type}` | Fallback when no Airtable record found |
| `assignedSchools` | `{LOGGED_IN_USER:Assigned_Schools}` | Fallback only |
| `assignedRegions` | `{LOGGED_IN_USER:Assigned_Regions}` | Fallback only |

**Important:** The app always resolves authoritative permissions from Airtable using `userEmail`. The other URL params are a fallback for dev/direct access or users not yet in `Users_Sync`.

---

## Permission System

### Account Types

| `accountType` | School picker shows | Comparison groups | Debug panel |
|---|---|---|---|
| `Site_Admin` | All schools | All enabled | Visible |
| `Client_Admin` | `School_Access_Formula` | All enabled | Hidden |
| `Region_User` | Schools in assigned regions | All enabled | Hidden |
| `School_User` | Schools in assigned schools | All enabled | Hidden |
| `''` (none/dev) | All schools | All enabled | Visible |

### `School_Access_Formula` (canonical school filter)

For all non-admin account types, the school picker is filtered to the schools in `School_Access_Formula` — a precomputed Airtable formula field on `Users_Sync` that unions the user's directly assigned schools with all schools in their assigned regions. This is the authoritative source; no additional join logic is needed in the app.

### Airtable Fields Required on `Users_Sync`

| Field | Type | Notes |
|---|---|---|
| `Email` | email | Used to look up the user record |
| `Account_Type` | singleSelect | `Site_Admin` / `Client_Admin` / `Region_User` / `School_User` |
| `Assigned_Schools` | multipleRecordLinks → Schools | Direct school assignments |
| `Assigned_Regions` | multipleRecordLinks → Regions | Regional assignments |
| `School_Access_Formula` | multilineText | Precomputed union (schools + region schools) |

### Debug Panel (Site_Admin / dev)

When `accountType === 'Site_Admin'` or no user context is present, an expandable **User Context** panel appears at the top of the form showing the resolved email, accountType, assignedSchools, assignedRegions, and the count of visible schools in the picker.

---

## Dashboard Features

### View Modes

| Mode | Description |
|---|---|
| **Table** | Sortable data table with all items and percentages |
| **Charts** | Stacked bar chart per item (Print to PDF supported) |
| **History** | Side-by-side comparison of two survey administrations |
| **Open Responses** | Free-text comments with demographic slicers |

### Group By (Table and Charts)

| Option | Behavior |
|---|---|
| **Item** | Sorted by item order. In multi-school mode: each item appears once as a section header, school rows nested underneath |
| **Domain** | Items grouped by category; uncategorized/open-ended last |
| **School** | (Multi-school only) All items for one school, then the next |

### School Picker (`SchoolMultiSelect`)

- Schools are organized by region with region-level checkboxes (select/deselect all schools in a region)
- Available schools are scoped to the user's `School_Access_Formula` (for non-admin users)
- Multiple schools can be selected; the picker shows an indeterminate state for partially-selected regions

### Comparison Groups

Available when one or more schools are selected. In multi-school mode, each school row shows its own city/region/network comparison values inline.

| Group | Data source |
|---|---|
| City | `City_Top_2_Percent` from `Survey_City_Item_Results_Link` lookup |
| Region | `Region_Top2_Percent` from `Survey_School_Item_Results` |
| Network | `Network_Top_2_Percent` from `Survey_Network_Item_Results_Link` lookup |

---

## Architecture & Data Flow

### Server / Client Split

```
Browser request
    ↓
page.tsx  (Server Component)
  ├── loadEmbedDashboard()  ← fetches filterOptions, schools, userContext in parallel
  └── <DashboardClient />   ← client boundary; owns all interactive state

DashboardClient  (Client Component)
  ├── renders FilterBar, SchoolMultiSelect, TabToggle, GroupBy toggle
  └── on "Load Results" click → POST /api/comparison | /api/comments | /api/history
                                     ↓
                               API route (server)
                                 ↓
                               lib functions (airtable.ts, aggregation.ts, …)
                                 ↓
                               JSON → DashboardClient → ResultsTable | ChartPanel
```

### lib/ Module Responsibilities

| Module | Role |
|---|---|
| `airtable.ts` | Singleton Airtable client, field name constants, paginated `fetchAllRecords()`, typed helpers (`fetchRespondents`, `fetchItems`, `fetchSchools`, `fetchSchoolItemResults`, `fetchUserPermissions`) |
| `types.ts` | All TypeScript interfaces — data shapes, filter types, API request/response bodies, `UserContext` |
| `filters.ts` | `getFilterOptions()` (unique values per slicer), `filterRespondents()` (AND across fields, OR within), `getSchoolOptions()` |
| `items.ts` | `getSurveyItems()`, `getItemMap()` (by questionLabel), `getItemMapById()` (by Airtable record ID) |
| `aggregation.ts` | `aggregateAgreement()` (4-bucket counts + pcts), `aggregateTopN()`, `buildComparisonRows()` (school + comparison group merge) |
| `comments.ts` | `getComments()` — post-filters by respondent, joins item prompts via `itemMapById` |
| `csv.ts` | `toCsv()` — RFC 4180, double-quote escaping, UTF-8 BOM |
| `loadDashboard.ts` | `loadEmbedDashboard()` / `loadAdminDashboard()` — shared entry points for both page routes |

### API Routes

| Route | Method | Request | Response |
|---|---|---|---|
| `/api/filters` | GET | — | `{ filterOptions, schools }` |
| `/api/items` | GET | — | `SurveyItem[]` |
| `/api/results` | POST | `{ filters, mode }` | `AgreementRow[]` or `TopNRow[]` |
| `/api/comments` | POST | `{ filters }` | `CommentRow[]` |
| `/api/comparison` | POST | `{ schoolTxt, comparisonGroups, domain?, administration? }` | `ComparisonRow[]` |
| `/api/history` | POST | `{ adminA, adminB, domain?, school? }` | `HistoryRow[]` |

All routes use `force-dynamic` (no ISR). `/api/filters` and `/api/items` include `s-maxage=300` cache headers for optional CDN caching.

### Filter Logic

- **Within a field:** OR — respondent passes if any selected value matches
- **Across fields:** AND — all active field filters must pass
- **Race / Gender:** intersection check (multi-value fields; respondent passes if any of their values appear in the selection)
- **Open-ended items** (`likertScale === 0`) are excluded from Table and Charts views; they appear only in Open Responses

---

## Airtable Schema

All table IDs and field names confirmed from `Reference/Schema_Registry-*.csv`.

### Table IDs

| Table | ID |
|---|---|
| Survey_Respondents | `tblE1rwPUjtxodIvZ` |
| Survey_Items | `tbl9lguOzNO8VjMvY` |
| Survey_Item_Comments | `tbla8CWwKDBuQwmtq` |
| Survey_School_Item_Results | `tblwEdi9EQhCsixNd` |
| Schools | `tblTyVLW0R8MxmQ0S` |
| Users_Sync | `tblWQJewTlrkfypPP` |
| Regions | `tblKXWbABAC2WoXCn` |

### Survey_Respondents (`tblE1rwPUjtxodIvZ`)

| Field | Type | Notes |
|---|---|---|
| `Respondent_Key` | multilineText | Unique join key |
| `Survey_Admin` | singleSelect | Administration period slicer |
| `School_Name (from School_Link)` | lookup | School name |
| `School_Link` | multipleRecordLinks | → Schools |
| `Region (from School_Link)` | lookup | Region slicer |
| `Race_Multiselect` | multipleSelects | Multi-value race slicer |
| `Gender_Select` | multipleSelects | Multi-value gender slicer |
| `Select Your Grade` | singleSelect | Grade slicer |
| `Student_Item_Comments` | multipleRecordLinks | → Survey_Item_Comments |
| `{Question_Label}` | singleSelect | Response column per item |
| `{Question_Label}_Top2` | number (0/1) | Pre-computed top-2 indicator |
| `{Question_Label}_Top3` | number (0/1) | Pre-computed top-3 indicator |

### Survey_Items (`tbl9lguOzNO8VjMvY`)

| Field | Type | Notes |
|---|---|---|
| `Item_AT_ID` | multilineText | Unique item identifier |
| `Item_Order` | singleLineText | Display sort order (parsed as int) |
| `Item_Prompt` | singleLineText | Display text in dashboard |
| `Question_Label` | singleLineText | Column name in Survey_Respondents |
| `Question_Type` | singleSelect | `Likert` / open-ended / etc. |
| `Category_Code` | multilineText | Domain text |
| `Category_Select` | multipleSelects | Domain multi-select (used for domain filter) |
| `Top_2` | multipleSelects | Top-2 response value strings |
| `Top_3` | multipleSelects | Top-3 response value strings |
| `Likert_Scale` | number | Scale size; `0` = open-ended (excluded from table/charts) |

### Survey_Item_Comments (`tbla8CWwKDBuQwmtq`)

| Field | Type | Notes |
|---|---|---|
| `Comment_Text` | multilineText | Response text |
| `Survey_Item_Link` | multipleRecordLinks | → Survey_Items (use `[0]` for record ID) |
| `Survey_Admin` | singleSelect | Administration |
| `School_Link` | multipleRecordLinks | → Schools |
| `Region (from School_Link)` | lookup | Region |
| `Gender_Tags` | multipleSelects | Gender tags |
| `Race_Tags` | multipleSelects | Race tags |
| `Respondent_Link` | singleLineText | Text key → Survey_Respondents.Respondent_Key |

### Survey_School_Item_Results (`tblwEdi9EQhCsixNd`)

Pre-aggregated school-level results. One record = one school × one survey item × one administration.

| Field | Type | Notes |
|---|---|---|
| `School_Txt` | singleLineText | School name (matches SchoolInfo.name) |
| `Administration_Key` | singleLineText | Administration identifier |
| `City_Txt` | lookup | City name |
| `Region_Txt` | lookup | Region name |
| `Question_Label_Txt` | singleLineText | Maps to SurveyItem.questionLabel |
| `Question_Prompt` | lookup | Item prompt text |
| `Item_Order` | number | Sort order |
| `Survey_Item_Link` | multipleRecordLinks | → Survey_Items |
| `Respondents` | number | School N |
| `Percent_Top_2` | number (0–1) | School top-2 % (multiplied ×100 in app) |
| `Percent_Top_3` | number (0–1) | School top-3 % |
| `School_Strongly_Agree_Count` | number | |
| `School_Agree_Count` | number | |
| `School_Neutral_Count` | number | |
| `School_Negative_Count` | number | |
| `City_Respondents (from …)` | lookup | City comparison N |
| `City_Top_2_Percent (from …)` | lookup | City top-2 % |
| `City_Top_3_Percent (from …)` | lookup | City top-3 % |
| `Region_Respondents` | lookup | Region comparison N |
| `Region_Top2_Percent` | lookup | Region top-2 % |
| `Region_Top3_Percent` | lookup | Region top-3 % |
| `Network_Respondents (from …)` | lookup | Network comparison N |
| `Network_Top_2_Percent (from …)` | lookup | Network top-2 % |
| `Network_Top_3_Percent (from …)` | lookup | Network top-3 % |

### Response Scale

The survey uses a **4-bucket** scale mapped to brand colors:

| Response | Brand color | Hex |
|---|---|---|
| Strongly Agree | Navy | `#17345B` |
| Agree | Blue | `#255694` |
| Neutral | Lime | `#BCD631` |
| Negative | Orange | `#F79520` |

**Top-2** = Strongly Agree + Agree
**Top-3** = Strongly Agree + Agree + Neutral

Pre-computed `{Question_Label}_Top2` and `{Question_Label}_Top3` fields (0/1 numbers) in `Survey_Respondents` are the primary source. `aggregateAgreement()` falls back to bucket counting when these fields are absent.

---

## Brand Palette

Defined in `globals.css` as CSS custom properties and in `tailwind.config.ts` as `brand.*` extensions:

| Token | Hex | Use |
|---|---|---|
| `--color-navy` / `brand.navy` | `#17345B` | Primary / Strongly Agree / headers |
| `--color-blue` / `brand.blue` | `#255694` | Agree / secondary UI |
| `--color-lime` / `brand.lime` | `#BCD631` | Neutral / region chips |
| `--color-orange` / `brand.orange` | `#F79520` | Negative / warnings |
| `--color-slate` / `brand.slate` | `#5E738C` | Secondary text / n= labels |

---

## Deployment

The app is deployed to Vercel and connected to this GitHub repository. Every push to `main` triggers a Vercel rebuild.

```bash
git push origin main  # triggers Vercel deploy automatically
```

### Manual deploy / new project setup

1. Push the repo to GitHub.
2. In [Vercel](https://vercel.com), import the repository.
3. Add `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` under **Environment Variables**.
4. Deploy. Vercel auto-detects Next.js.

All pages and API routes use `export const dynamic = 'force-dynamic'` — every request hits Airtable live with no ISR cache. To add caching, wrap `getFilterOptions()` and `getSchoolOptions()` with Next.js `unstable_cache`.

### Vercel URL

```
https://ckcs-survey-results.vercel.app/dashboard     — Softr embed endpoint
https://ckcs-survey-results.vercel.app/admin_access  — Direct admin access
https://ckcs-survey-results.vercel.app/admin/debug   — Airtable diagnostics
```

---

## Development Notes

### Adding a New Survey Administration

No code changes needed. The `Survey_Admin` singleSelect values in Airtable drive the Administration dropdown automatically. New values appear on the next page load.

### Adding a New School

Add a row to the `Schools` table in Airtable and create the corresponding `Survey_School_Item_Results` records. The school picker populates from `Survey_School_Item_Results` (only schools with result data appear).

### Adding a New Permission User

Add a row to `Users_Sync` with the user's email, `Account_Type`, and `Assigned_Schools` / `Assigned_Regions` links. The `School_Access_Formula` field should be a formula that unions both. Verify the resolved permissions at `/admin/debug?testEmail=their@email.com`.

### Verifying Field Names

Run `/admin/debug` to confirm all slicer values, item mappings, respondent counts, and comparison probe results against live Airtable data.
