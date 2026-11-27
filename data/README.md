# Data provenance and licensing

Source: [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api), Best Match (reported acquisition setting). Reported requested coordinates from the supplied acquisition URL: latitude 6.9355, longitude 79.8487. The full original query and acquisition date are unavailable here; the relationship between that URL and these exact exported snapshots requires confirmation. Both exported metadata records identify returned latitude 6.924429, longitude 79.90725, elevation 4 m, Asia/Colombo, UTC offset 19800 seconds. Returned coordinates must not be represented as requested coordinates. Best Match may combine products; the files do not identify the underlying model per timestamp.

## Directory layout

```text
data/
├── README.md
├── raw/
│   ├── open-meteo-6.92N79.91E4m-hourly.csv
│   └── open-meteo-6.92N79.91E4m-daily.csv
└── processed/
    ├── processed_daily.csv
    ├── calibration_daily.csv
    ├── evaluation_daily.csv
    ├── summary.csv
    └── aggregation_metrics.csv
```

Figures are stored in the repository-root `figures/` directory.

## Source snapshots

- [`open-meteo-6.92N79.91E4m-hourly.csv`](raw/open-meteo-6.92N79.91E4m-hourly.csv): 219168 rows, 2001-01-01 00:00 to 2026-01-01 23:00; `time`, `precipitation (mm)`. SHA256 `d14a8d9739fdf5337172a82b28226fa446af02919a92dfbef8cc52701d5d9601`.
- [`open-meteo-6.92N79.91E4m-daily.csv`](raw/open-meteo-6.92N79.91E4m-daily.csv): 9132 rows, 2001-01-01 to 2026-01-01; `time`, `precipitation_sum (mm)`, `precipitation_hours (h)`. SHA256 `dc672e756178597e04c779eddee2003ae4312003578ea85d0f1730aa5c5fdcda`.

## Processing

Select 2001-01-01 01:00 through 2026-01-01 00:00 inclusive; subtract one hour from local accumulation-ending timestamps, then sum by calendar date. Retain raw daily amounts, zero amounts below 0.1 mm for modelling, label seasons and split chronologically. Calibration 2001–2020; evaluation 2021–2025. Calibration all-day P95 (linear interpolation) = 25.2 mm; strict exceedance defines extreme days. P99 = 46.296 mm. No trace rainfall removed. Daily provider totals match unshifted hourly totals to numerical precision; corrected totals have MAE 0.406067 mm and 3353 discrepancies >0.1 mm. Comparison is not gauge validation.

[`processed_daily.csv`](processed/processed_daily.csv) contains all 9131 days; [`calibration_daily.csv`](processed/calibration_daily.csv) and [`evaluation_daily.csv`](processed/evaluation_daily.csv) contain 7305 and 1826 days. Columns: date, rainfall_mm, model_rainfall_mm, is_wet, year, month, season, is_extreme, split. [`summary.csv`](processed/summary.csv) and [`aggregation_metrics.csv`](processed/aggregation_metrics.csv) report historical statistics.

## Attribution and reuse

Weather data by Open-Meteo (https://open-meteo.com/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Provider [licence](https://open-meteo.com/en/license), [terms](https://open-meteo.com/en/terms), and [pricing/attribution](https://open-meteo.com/en/pricing), consulted 2026-11-27, permit redistribution with attribution and indication of changes. Free API service restrictions are separate from data reuse rights. Potential upstream source: Copernicus Climate Change Service (C3S)/ECMWF; see provider licence for source notices. Exact source mix unknown. No endorsement implied. Derived tables and figures are modified from Open-Meteo data by the transformations above. MIT covers project code, not weather data. Academic literature is listed in [REFERENCES.md](../REFERENCES.md).

## Reproduction

After reviewing source credits, place both unchanged source snapshots in `data/raw/` in the public repository. The notebook attempts raw GitHub URLs under `main/data/raw/` first, then local `data/raw/`, the output root’s `data/raw/`, or `../data/raw/`. Set `RAINFALL_DATA_DIR` to an existing raw directory to explicitly select local execution. Both downloaded and local snapshots are checked against the SHA-256 values above. Outputs are written to `data/processed/` and root-level `figures/` under the output root; required directories are created automatically. No interactive upload is required. Keep the raw files immutable; use the original supplied snapshots. Output root defaults to the working directory and can be set with `RAINFALL_OUTPUT_DIR`. Run all cells in order with numpy, pandas and matplotlib available.
