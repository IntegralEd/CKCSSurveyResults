# CKCS Survey Results — Change Checklist

Items ordered from data layer → API → UX → visualization.

---

## Data Layer

- [ ] **D1 — Schema: Survey_School_Item_Results table**
  Add `Survey_School_Item_Results` to `airtable.ts`: confirm table ID from schema registry, map fields (school, item link, city avg, region avg, network avg, item order). Add typed fetch helper.

- [ ] **D2 — Schema: Schools table join path**
  Confirm Schools table field names that link a respondent's school to its City, Region, and Network groupings. Map those lookup fields so comparison group values can be resolved.

- [ ] **D3 — Types: ComparisonRow**
  Add `ComparisonRow` type to `types.ts`:
  `{ questionLabel, prompt, domain, itemOrder, schoolTop2Pct, cityTop2Pct, regionTop2Pct, networkTop2Pct, n }` (and Top3 variants).

- [ ] **D4 — Aggregation: comparison group logic**
  Add `aggregateComparison()` in `aggregation.ts`. Pulls school-level results from `Survey_School_Item_Results`. Comparison groups (city / region / network) are pre-aggregated in that table — read directly, do not re-compute from respondent rows.

---

## API

- [ ] **A1 — New route: POST /api/comparison**
  Accepts `{ schoolId, comparisonGroups: ('city'|'region'|'network')[], filters, mode }`.
  Returns `ComparisonRow[]` sorted by `Item_Order` ascending.

- [ ] **A2 — Update /api/filters**
  Return school list with their associated city, region, and network values so the UI can derive which comparison groups are available once a school is selected.

- [ ] **A3 — Debug panel: Section 6**
  Add probe for `Survey_School_Item_Results` — show table ID, first 3 records, and field shape.

---

## UX — Filter Form (gate before load)

- [ ] **U1 — Primary filter form (pre-load gate)**
  Replace the current "load everything on mount" behavior. Show a filter form first; results only load after the user submits. Prevents fetching 5k rows before any context is set.

- [ ] **U2 — Comparison group selector**
  Multi-select toggle (City / Region / Network) with dependency locking:
  - All three locked until a school is selected
  - Region + Network unlock when a city is selected
  - Network unlocks when a region is selected
  - Locked states render grayed-out (disabled, `opacity-40`, `cursor-not-allowed`)

- [ ] **U3 — Filter dependency wiring**
  When school is selected, auto-populate and enable the city/region/network options from the Schools lookup. Clear downstream selections when a parent filter is cleared.

- [ ] **U4 — "Load Results" submit button**
  Replaces auto-fetch. Active only when at least one primary filter (school, region, or admin) is selected. Disabled + grayed otherwise.

---

## UX — Loading State

- [ ] **U5 — SVG spinner (loading indicator)**
  While results fetch, display the compiler SVG (`src/Assets/noun-compiler-8277230-17345B.svg`) centered with a CSS `@keyframes` spin animation on the gear element. Replace current "Loading results…" text.

---

## UX — Results Table

- [ ] **U6 — Item prompt as first column / row anchor**
  Ensure `prompt` is always the first visible column in results tables, sorted by `Item_Order` ascending (already default in agreement mode; enforce in topn and comparison modes).

- [ ] **U7 — Post-load slicers**
  After results load, expose the demographic slicers (race, gender, grade) as secondary filters that re-aggregate client-side or re-fetch without resetting the primary school/comparison context.

---

## Visualization (lower priority)

- [ ] **V1 — Stacked bar component**
  Build `StackedBar.tsx`: a single horizontal bar divided into 4 segments using brand colors:
  - Strongly Agree `#17345B`
  - Agree `#255694`
  - Neutral `#BCD631`
  - Negative `#F79520`
  Proportions from `stronglyAgreePct`, `agreePct`, `neutralPct`, `negativePct`.
  Width = 100% of container; segments labeled with `%` if wide enough.

- [ ] **V2 — Chart view toggle**
  Add a "Chart" tab alongside Agreement / Top 2/3 / Comments. In chart view, replace the text cells for each row with a `StackedBar` inline in the table, following the layout from `Reference/Softr_Chart_Style_Reference.rtf`.

- [ ] **V3 — Comparison group bars**
  In chart view with comparison groups active, render stacked bars for each group side-by-side per item row (school / city / region / network), each a full-width bar in its own sub-row.
