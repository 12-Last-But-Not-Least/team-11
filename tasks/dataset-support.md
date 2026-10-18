# Dataset support implementation

Feature scope and implementation sequence for named datasets and CSV imports.

## Minimal scope

- One selected dataset per browser session; include its ID on each API request.
- Build the features using the existing iPhone/falls and ice cream/sharks
  tables. Expand to 3–5 defaults after switching and import functionality work.
- Default datasets must represent real data with documented original sources
  and preparation steps. Do not ship synthetic examples as defaults. Small
  generated fixtures may remain in automated tests.
- One uploaded CSV is one isolated table. No SQL connections, spreadsheets,
  cross-dataset joins, or simultaneous dataset overlays in this iteration.
- Preserve raw values. Numeric axes only. Filter missing values using the same
  paired observations for plots and statistics. Require at least three pairs
  and nonconstant axes.
- Use a numeric ordering column when configured; otherwise use one-based row
  order, without describing it as time. The bundled monthly table is already in
  January–December order and uses month indexes 1–12.
- Initial import storage target: local backend files plus metadata, surviving
  restart. Shared hosting, authentication, and per-user ownership are outside
  this local MVP.

## Implementation units

1. **Named dataset registry and API**.
   Add `/datasets`, dataset-scoped columns/plots/statistics, the two existing examples,
   dataset identity in plot metadata, and regression tests. Preserve the old
   year-joined API when `dataset_id` is omitted so the current UI keeps working.
2. **Frontend dataset switching** — pending.
   Wire the header dropdown to the catalog and dataset defaults. Update all
   worksheet results and exports together. Guard stale dataset/column/plot
   responses; reset old results on dataset changes. Replace year-only copy.
3. **CSV import and persistence** — pending.
   Add bounded upload validation and local storage, then an import UI with
   understandable feedback. Add successful imports to the catalog and select
   them. Document size/row limits, missing-value rules, and storage behavior.
4. **Sourced default datasets** — pending, after feature development.
   Verify original sources for the existing examples and add real datasets to
   reach 3–5 defaults. Record source URLs, units, applicable reuse terms, and
   cleaning/normalization steps. A repository filename alone is not provenance.

## Backend compatibility

- No frontend behavior changes yet; inspect `/docs` or the API to try the new
  functionality. No upload endpoint exists in this unit.
- Bundled examples reuse existing repository data; descriptions identify the
  cleaning output, not independently verified external provenance.
- `plotting/data.py` is retained as the legacy compatibility path.
- The new tables are read on demand, with no shared active selection or cache.
- Existing tests are retained. New coverage checks dataset isolation across
  clients, default plots, selected axes, ordering, missing pairs, invalid
  datasets/columns, and the minimum statistical sample size.

- The minimum sample size check applies to named datasets only; the existing
  statistics function and legacy API retain their behavior.
