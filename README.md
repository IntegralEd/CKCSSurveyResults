# CKCS Survey Results Dashboard

A pivot-table-style dashboard for CKCS survey data pulled live from Airtable.
Built with Next.js 14 App Router, TypeScript, and Tailwind CSS. Deployed to Vercel.

---

## Setup

```bash
# 1. Clone
git clone <repo-url>
cd CKCSSurveyResults

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local and fill in your Airtable credentials (see below)

# 3. Install dependencies
npm install

# 4. Run development server
npm run dev
# Open http://localhost:3000  →  redirects to /dashboard
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|---|---|
| `AIRTABLE_API_KEY` | Your Airtable Personal Access Token (starts with `pat`) |
| `AIRTABLE_BASE_ID` | The Base ID from the Airtable URL (starts with `app`) |
| `AIRTABLE_TABLE_RESPONDENTS` | Override table ID (default: `tblE1rwPUjtxodIvZ`) |
| `AIRTABLE_TABLE_ITEMS` | Override table ID (default: `tbl9lguOzNO8VjMvY`) |
| `AIRTABLE_TABLE_COMMENTS` | Override table ID (default: `tbla8CWwKDBuQwmtq`) |

The Airtable PAT needs **read** access to the base. No write permissions required.

---

## Confirmed Airtable Schema

All field names below are confirmed from the Schema_Registry CSV.

### Table IDs (confirmed)
| Table | ID |
|---|---|
| Survey_Respondents | `tblE1rwPUjtxodIvZ` |
| Survey_Items | `tbl9lguOzNO8VjMvY` |
| Survey_Item_Comments | `tbla8CWwKDBuQwmtq` |

### Survey_Respondents — confirmed field names
| Field name | Type | Purpose |
|---|---|---|
| `Respondent_Key` | multilineText | Unique join key |
| `Survey_Admin` | singleSelect | Administration period slicer |
| `School_Name (from School_Link)` | singleLineText | School name for display |
| `School_Link` | multipleRecordLinks | Linked to Schools table |
| `Region (from School_Link)` | singleLineText | Region slicer |
| `Race_Multiselect` | multipleSelects | Race slicer (multi-value) |
| `Race_Ethnicity` | singleLineText | Raw race text |
| `Gender_Select` | multipleSelects | Gender slicer (multi-value) |
| `Gender` | singleLineText | Raw gender text |
| `Select Your Grade` | singleSelect | Grade slicer |
| `Student_Item_Comments` | multipleRecordLinks | Linked to Survey_Item_Comments |
| `{Question_Label}` | singleSelect | Response column per survey item |
| `{Question_Label}_Top2` | number (0/1) | Pre-computed top-2 indicator |
| `{Question_Label}_Top3` | number (0/1) | Pre-computed top-3 indicator |

### Survey_Items — confirmed field names
| Field name | Type | Purpose |
|---|---|---|
| `Item_AT_ID` | multilineText | Unique item identifier |
| `Item_Order` | singleLineText | Display sort order (parsed as int) |
| `Item_Prompt` | singleLineText | Display text shown in the dashboard |
| `Question_Label` | singleLineText | Maps to column name in Survey_Respondents |
| `Question_Type` | singleSelect | Item type (likert, open, etc.) |
| `Category_Code` | multilineText | Domain text |
| `Category_Select` | multipleSelects | Domain as multi-select (used for domain filter) |
| `Top_2` | multipleSelects | Top-2 response value strings |
| `Top_3` | multipleSelects | Top-3 response value strings |
| `Top_2_Flat` | multilineText | Flat text of top-2 values |
| `Top_3_Flat` | multilineText | Flat text of top-3 values |
| `Likert_Scale` | number | Scale size |
| `Network_Top_1` | number | Network aggregate |
| `Network_Top_2` | number | Network aggregate |
| `Administrations_Link` | multipleRecordLinks | Linked to Survey_Administrations |

### Survey_Item_Comments — confirmed field names
| Field name | Type | Purpose |
|---|---|---|
| `Comment_Text` | multilineText | The response text |
| `Survey_Item_Link` | multipleRecordLinks | Links to Survey_Items (use record ID [0]) |
| `Survey_Admin` | singleSelect | Administration |
| `School_Link` | multipleRecordLinks | Linked to Schools |
| `Region (from School_Link)` | singleLineText | Region |
| `Gender_Tags` | multipleSelects | Gender tags |
| `Race_Tags` | multipleSelects | Race tags |
| `Respondent_Link` | singleLineText | Text key back to respondent (NOT a linked record) |
| `School_Item_Comment_Key` | multilineText | Composite key |

### Response scale (confirmed)
The survey uses a **4-bucket** response scale:
- `Strongly Agree` — maps to brand.navy (#17345B)
- `Agree` — maps to brand.blue (#255694)
- `Neutral` — maps to brand.lime (#BCD631)
- `Negative` — maps to brand.orange (#F79520)

**Top-2** = Strongly Agree + Agree
**Top-3** = Strongly Agree + Agree + Neutral

Pre-computed `{Question_Label}_Top2` and `{Question_Label}_Top3` (0/1 number fields) in
Survey_Respondents are used as the primary source for top-N percentages. See
`src/lib/aggregation.ts` for the fallback logic when these fields are absent.

---

## Fields Still Needing Confirmation

The following items require verification against the live Airtable data before
the dashboard results can be trusted:

1. **Exact string values in response singleSelect fields**
   - Expected: `'Strongly Agree'`, `'Agree'`, `'Neutral'`, `'Negative'`
   - Verify exact casing matches the values stored in Survey_Respondents
   - Edit `RESPONSE_BUCKETS` in `src/lib/aggregation.ts` if they differ

2. **`Select Your Grade` values**
   - Confirm the exact grade label strings (e.g. `'9th Grade'`, `'10th'`, `'Freshman'`, etc.)
   - The `/admin/debug` page will show live sample values once connected

3. **`Survey_Admin` values**
   - Confirm the exact administration name strings (e.g. `'Fall 2024'`, `'Spring 2025'`)
   - The `/admin/debug` page will show live sample values

4. **`Region (from School_Link)` population**
   - Confirm this lookup field is consistently populated for all respondents
   - If sparse, the Region filter will have limited usefulness

5. **`Respondent_Link` → `Respondent_Key` join**
   - Confirm that `Survey_Item_Comments.Respondent_Link` text values match
     `Survey_Respondents.Respondent_Key` values for the same respondent
   - Once confirmed, implement the precise respondent-level comment filter
     (see TODO in `src/lib/comments.ts`)

---

## Vercel Deployment

1. Push the repo to GitHub (or GitLab / Bitbucket).
2. In the [Vercel dashboard](https://vercel.com), click **Add New Project** and import the repo.
3. In **Environment Variables**, add `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` with your
   production values. Table IDs are hardcoded defaults; only add the table overrides if needed.
4. Click **Deploy**. Vercel auto-detects Next.js and configures the build.

The app uses `force-dynamic` on all pages and API routes, so no ISR cache configuration
is needed — every request hits Airtable live.

> Tip: If you want to cache filter options to avoid a full scan on every page load,
> wrap `getFilterOptions()` with Next.js `unstable_cache` or add `s-maxage` headers.

---

## Architecture Overview

```
src/
  app/
    layout.tsx              — Root layout: header nav + Tailwind body
    page.tsx                — Redirects / → /dashboard
    globals.css             — @tailwind directives + CSS custom properties (brand colors)
    dashboard/
      page.tsx              — Server Component: fetches filter options, passes to client
      DashboardClient.tsx   — Client Component: owns all state, posts to API routes
    api/
      filters/route.ts      — GET  → FilterOptions
      items/route.ts        — GET  → SurveyItem[]
      results/route.ts      — POST → AgreementRow[] | TopNRow[]
      comments/route.ts     — POST → CommentRow[]
    admin/debug/page.tsx    — Diagnostic page for verifying Airtable connectivity
  lib/
    airtable.ts             — Airtable client + field constants + typed fetch helpers (server-only)
    types.ts                — All shared TypeScript interfaces
    filters.ts              — getFilterOptions(), filterRespondents()
    items.ts                — getSurveyItems(), getItemMap(), getItemMapById()
    aggregation.ts          — aggregateAgreement(), aggregateTopN()
    comments.ts             — getComments()
    csv.ts                  — toCsv() (safe for client + server)
  components/
    FilterBar.tsx           — Horizontal row of MultiSelect dropdowns + Reset All
    MultiSelect.tsx         — Checkbox dropdown, no external deps
    ResultsTable.tsx        — Sortable striped table (brand color active states)
    TabToggle.tsx           — Agreement / Top 2-3 / Open Responses (brand.navy active)
    DownloadButton.tsx      — CSV download trigger
```

### Data flow

1. `/dashboard` (server) calls `getFilterOptions()` and passes results to `DashboardClient`.
2. `DashboardClient` renders `FilterBar` + `TabToggle` with initial state (all filters empty, mode = agreement).
3. On mount (and on any filter/mode change), `DashboardClient` POSTs to `/api/results` or `/api/comments`.
4. API routes call the relevant lib functions (`filterRespondents` → `aggregateAgreement` / `getComments`) and return JSON.
5. `DashboardClient` renders `ResultsTable` and `DownloadButton` with the returned rows.

### Key data model notes

- **Race and Gender are multi-value**: `Race_Multiselect` and `Gender_Select` are
  `multipleSelects` fields. A respondent may belong to multiple race or gender categories.
  Filter logic uses intersection (passes if any selected value matches any respondent value).
- **Pre-computed top-N**: Survey_Respondents has `{QuestionLabel}_Top2` and `{QuestionLabel}_Top3`
  (0/1 number fields). `aggregateAgreement()` sums these for top-N percentages, falling back
  to bucket counts when absent.
- **Comment join**: Comments link to items via `Survey_Item_Link` (linked record IDs).
  `getItemMapById()` in `items.ts` provides an O(1) lookup by Airtable record ID.
