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
- Uploaded datasets stay in backend memory and are shared by all clients.
  Backend restarts clear uploads. No uploaded CSVs are written to disk.

## Implementation units

1. **Named dataset registry and API** — committed (`77fc809`).
   Add `/datasets`, dataset-scoped columns/plots/statistics, the two existing examples,
   dataset identity in plot metadata, and regression tests. Preserve the old
   year-joined API when `dataset_id` is omitted so the current UI keeps working.
2. **Frontend dataset switching** — committed (`21f55a2`).
   Wire the header dropdown to the catalog and dataset defaults. Update all
   worksheet results and exports together. Guard stale dataset/column/plot
   responses; reset old results on dataset changes. Replace year-only copy.
3. **CSV import and temporary storage** — implemented, awaiting review.
   Add CSV validation and temporary memory storage, then an import UI with
   understandable feedback. Add successful imports to the catalog and select
   them. Document missing-value rules and storage behavior.
4. **Sourced default datasets** — pending, after feature development.
   Verify original sources for the existing examples and add real datasets to
   reach 3–5 defaults. Record source URLs, units, applicable reuse terms, and
   cleaning/normalization steps. A repository filename alone is not provenance.

## Compatibility and switching behavior

- The header lists named datasets from `/datasets`. Each selection loads its
  columns and default axes and sends the dataset ID with both plot requests.
- Switching hides old charts, statistics, interpretations, and export controls
  until both new plots succeed. Late responses are ignored. A failed switch
  shows an error; users can select another dataset to recover.
- Chart instances are retained while hidden and reset with the next results.
  Dataset changes reset axis/size selections and change highlights. Returning
  to a previous dataset waits for a fresh result instead of showing an old run.
- Download names include the dataset ID; copied statistics include its name.
- CSV upload validates and saves a dataset, adds it to the catalog, and selects
  it. Failed uploads leave the current dataset and results intact.
- Bundled examples reuse existing repository data; descriptions identify the
  cleaning output, not independently verified external provenance.
- `plotting/data.py` is retained as the legacy compatibility path.
- Bundled tables are read on demand; uploaded numeric tables remain in memory.
  There is no shared active dataset selection.
- Existing tests are retained. New coverage checks dataset isolation across
  clients, default plots, selected axes, ordering, missing pairs, invalid
  datasets/columns, and the minimum statistical sample size.

- The minimum sample size check applies to named datasets only; the existing
  statistics function and legacy API retain their behavior.

## CSV import decisions

- UTF-8 comma-delimited CSV only, with optional BOM; no additional dependencies.
  No application-defined size, row, column, or filename-length caps. Headers are trimmed and must
  be nonempty and unique. Blank lines are skipped; field counts must match.
- Numeric columns may have blank cells or `NA` markers (case-insensitive).
  Text/mixed columns are excluded from the imported table and axes, with feedback.
  NaN and infinity are rejected.
- Defaults are the first usable pair of nonconstant numeric measurements with
  at least three complete paired rows. A complete numeric `year` orders rows
  and can serve as a fallback axis. Otherwise a generated row index is used;
  it does not overwrite an existing CSV column or imply time.
- All numeric CSV columns, including `rownames`, are eligible for default axes
  in their original order. Saved imports retain their stored default choices.
- `POST /datasets?filename=...` accepts the raw CSV body and returns metadata.
  No multipart dependency or preview/mapping wizard is required for this MVP.
- Imported numeric tables and metadata live in one backend dictionary under
  generated IDs. All clients can access them; page reloads retain access.
- Backend restarts, redeployments, or hosting spin-down clear uploads. Closing
  a browser does not clear server memory. Run one backend process/worker:
  independent workers do not share this in-memory registry. Old local upload
  files are no longer read. No rename/deletion UI in this unit.
- Reimporting a file creates a separate dataset and never overwrites another.
- Switching datasets clears the previous import confirmation and file selection.
- Bundled tables and uploads share numeric CSV parsing and ordering-key logic.
  CSV parsing and storage run outside the API event loop for uploads. Numerical
  overflow is checked during analysis for every selected pair, returning 422.
- Row-range display avoids JavaScript argument spreading so large datasets do
  not fail merely while calculating their displayed minimum and maximum.
- Automated backend tests isolate the in-memory registry. Browser tests use
  separate ports (8001/5174), do not reuse running development servers, and
  verify reloads and availability to other clients.
