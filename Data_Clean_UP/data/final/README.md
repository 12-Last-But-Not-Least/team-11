# Default datasets

The five named defaults share this directory. The original two files are
`normalized_merged_set.csv` (iPhone sales/fall deaths) and
`normalized_icecream_sharks_merged.csv` (ice cream/shark attacks).
Their existing values and preparation are unchanged; see `../../DataProcessing.ipynb`.

## Formatting of the three additions

UTF-8, comma-separated, one header row, lowercase snake_case headers, LF line
endings, and blank cells for missing values. Original cell values, row order,
and all observations are retained. No normalization, imputation, or rounding.
The original downloads were retrieved on 2026-10-18.

- `faithful.csv`: headers unchanged (`rownames,eruptions,waiting`).
- `airquality.csv`: `Ozone` -> `ozone`, `Solar.R` -> `solar_r`, `Wind` -> `wind`,
  `Temp` -> `temp`, `Month` -> `month`, `Day` -> `day`; `rownames` unchanged.
- `penguins.csv`: `year` -> `observation_year`; other headers unchanged.
  This prevents individual penguins from entering the legacy annual cross-file
  join, which loads files containing an exact `year` header.
- Source `NA` markers become blank cells; both mean missing to the parser.

## Palmer Penguins

- 344 observations; default flipper length/body mass comparison has 342 pairs.
- Source CSV: https://raw.githubusercontent.com/allisonhorst/palmerpenguins/main/inst/extdata/penguins.csv
- Documentation and original citations: https://allisonhorst.github.io/palmerpenguins/articles/intro.html
- Maintainers: Allison Horst, Alison Hill, and Kristen Gorman.
- CC0 terms: https://allisonhorst.github.io/palmerpenguins/LICENSE.html
- Bill and flipper dimensions are millimeters; body mass is grams. Species,
  island, and sex remain text; observation_year retains the collection year.
- Generated row number is file order, not time. The default pools three species.
- Original download SHA-256: `f204db2c753b0937caac3cb35258562c14f073e4bbc76be24b4c51ce22767a93`.

## Old Faithful

- 272 observations; default eruption duration/waiting time comparison uses all rows.
- Source CSV: https://vincentarelbundock.github.io/Rdatasets/csv/datasets/faithful.csv
- R documentation: https://stat.ethz.ch/R-manual/R-devel/library/datasets/html/faithful.html
- R credits W. Hardle; measurements describe Old Faithful in Yellowstone.
- `eruptions` and `waiting` are minutes; `rownames` is the source row identifier.
- Original download SHA-256: `5043db1e2c51c8e8fd67e0868c768ae589770cc76ad0ac0c5b7afd1fca31fc57`.

## New York Air Quality

- 153 daily observations, May-September 1973; default ozone/solar radiation
  comparison has 111 complete pairs.
- Source CSV: https://vincentarelbundock.github.io/Rdatasets/csv/datasets/airquality.csv
- R documentation: https://stat.ethz.ch/R-manual/R-devel/library/datasets/html/airquality.html
- Original sources: New York State Department of Conservation and National
  Weather Service, as credited in the R documentation.
- Ozone is ppb, solar radiation is Langleys, wind is mph, temperature is degrees
  Fahrenheit; month/day are calendar fields. `rownames` retains source row order.
- Original download SHA-256: `65d2c4afd976c169af9bb0bd97e9e78e1e8a185f1b52e2e3153e30f90c7fb5f8`.

### Rdatasets reuse note

The distributor documents GPL-3 for its code but does not establish a definitive
license for the numeric datasets themselves; it states its understanding that
they may be redistributed. Do not describe these two datasets as CC0.
See https://vincentarelbundock.github.io/Rdatasets/ for the distributor's terms.
