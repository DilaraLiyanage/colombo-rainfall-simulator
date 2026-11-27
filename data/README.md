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
    ├── aggregation_metrics.csv
    └── ... (calibration, simulation, verification and sensitivity exports)
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

Retain both unchanged source snapshots in `data/raw/`. Local execution detects the repository root by searching parent directories and reads its raw files directly. Colab downloads the original snapshots from public raw GitHub URLs under `main/data/raw/`; a failed download raises an error. `RAINFALL_DATA_DIR` explicitly selects a local snapshot directory and `RAINFALL_OUTPUT_DIR` selects an output root. Both downloaded and local snapshots are checked against the SHA-256 values above. Outputs are written to `data/processed/` and root-level `figures/` under the output root; required directories are created automatically. The default output root is the repository root locally and the current working directory in Colab. No interactive data upload is required. The first code cell uses standard `%pip` installation; C01 verifies installed and loaded scientific versions. All scientific cells run in the ordinary notebook kernel. The final completion manifest is written only by C30.

## Calibration outputs

All new tables use 2001–2020 only and inherit the attribution above. Shape means Gamma alpha or log-normal sigma; scale is in mm (log-normal scale = exp(mu)); exponential shape is blank. Probabilities are fractions, not percentages. The fixed wet threshold is 0.1 mm; P95/P99 thresholds remain 25.2/46.296 mm.

- [markov_transitions.csv](processed/markov_transitions.csv): Four homogeneous transitions with counts and probabilities.
- [occurrence_bic.csv](processed/occurrence_bic.csv): Conditional order-zero and order-one likelihood/BIC.
- [spell_statistics.csv](processed/spell_statistics.csv): Complete empirical and geometric spell summaries.
- [distribution_fits.csv](processed/distribution_fits.csv): Truncated distribution estimates, likelihood criteria and optimisation diagnostics.
- [distribution_quantiles.csv](processed/distribution_quantiles.csv): Observed and fitted conditional P90/P95/P99.
- [distribution_tail_errors.csv](processed/distribution_tail_errors.csv): Conditional tail probabilities and signed errors at fixed all-day thresholds.
- [analytical_benchmarks.csv](processed/analytical_benchmarks.csv): Stationary analytical targets and calibration comparisons.
- [seasonal_parameters.csv](processed/seasonal_parameters.csv): Destination-season transitions and truncated Gamma estimates.

F08–F14 are calibration diagnostics in root-level `figures/`. Raw snapshots and original processed data remain unchanged.

## Reproducible output inventory

[output_manifest.csv](processed/output_manifest.csv) lists generated files and producing cells. [runtime_versions.csv](processed/runtime_versions.csv) records Python, scientific packages and kernel support versions. [figure_data.json](processed/figure_data.json) captures numerical plotting primitives; raster appearance can differ with fonts, backend and platform. [model_parameters.json](processed/model_parameters.json) exports calibrated model parameters and thresholds in schema 2, including destination-date season mapping and origin semantics. The browser consumes a generated [JavaScript parameter asset](../docs/model-parameters.js), produced by `python generate_web_parameters.py` from the scientific exports; it never edits or refits them. The original notebook remains authoritative. Numerical comparisons use the metric-specific [reproducibility policy](../USER_GUIDE.md#numerical-reproducibility-policy): exact historical inputs, counts and classifications; original strict tolerances for transition probabilities and objective metrics; fitted-parameter rtol=1e-6 and bounded fit-dependent continuous tolerances. Exact PNG equality is not required across platforms.


## Simulation and holdout outputs

All simulation outputs are regenerated by the notebook using parameters estimated from calibration data in that same execution. The public raw snapshots are unchanged. Probabilities are fractions; rainfall units are mm or mm/day as specified by metric names. Timing files vary between runs. The holdout contains 1,826 dates and is used only for evaluation. All figures and synthetic results are derived from the credited Open-Meteo data and conditional stochastic model.

| File | Cell | Description |
|---|---|---|
| [simulation_verification.csv](processed/simulation_verification.csv) | C18 | 21 executed domain, limiting and reproducibility tests |
| [monte_carlo_analytical.csv](processed/monte_carlo_analytical.csv) | C19 | Seven analytical comparisons with MCSE, CI, PI, errors and tolerance outcomes |
| [annual_simulation_uncertainty.csv](processed/annual_simulation_uncertainty.csv) | C19 | Independent 365-day trajectories; annual totals, maxima and event risk with exact binomial event CIs |
| [convergence_batches.csv](processed/convergence_batches.csv) | C20 | Independent batch-level signed errors, MCSE and interval widths |
| [convergence_results.csv](processed/convergence_results.csv) | C20 | MAE, RMSE, mean MCSE and interval widths by N |
| [convergence_slopes.csv](processed/convergence_slopes.csv) | C20 | Fitted log-log RMSE slopes |
| [convergence_timing.csv](processed/convergence_timing.csv) | C20 | Measured batch execution times (not deterministic) |
| [holdout_comparison.csv](processed/holdout_comparison.csv) | C21 | Historical statistics, ensemble means, CIs, PIs, discrepancies and inclusion flags |
| [holdout_trajectory_statistics.csv](processed/holdout_trajectory_statistics.csv) | C21 | One row per independent five-year trajectory for seven core metrics |
| [holdout_aggregate_errors.csv](processed/holdout_aggregate_errors.csv) | C21 | Monthly climatology and seasonal mean rainfall MAE/RMSE |
| [simulation_config.json](processed/simulation_config.json) | C23 | Experiment counts, seed, thresholds recalculated during execution, stream namespaces and origin state |
| [execution_runtime.csv](processed/execution_runtime.csv) | C23 | Measured elapsed/bootstrapping seconds and scientific execution mode |

See the [manifest](processed/output_manifest.csv) for the complete inventory, including F01–F32. The data values and model outputs do not depend on previous CSV exports. Source credits and CC BY 4.0 attribution remain distinct from the MIT code licence.

## Seasonal and sensitivity outputs

- [seasonal_daily_expectations.csv](processed/seasonal_daily_expectations.csv)
- [seasonal_analytical.csv](processed/seasonal_analytical.csv)
- [seasonal_verification.csv](processed/seasonal_verification.csv)
- [seasonal_holdout.csv](processed/seasonal_holdout.csv)
- [comparative_holdout.csv](processed/comparative_holdout.csv)
- [comparative_errors.csv](processed/comparative_errors.csv)
- [comparative_paired.csv](processed/comparative_paired.csv)
- [sensitivity_scenarios.csv](processed/sensitivity_scenarios.csv)
- [seasonal_sensitivity_config.json](processed/seasonal_sensitivity_config.json)
- [seasonal_execution_runtime.csv](processed/seasonal_execution_runtime.csv)

The seasonal model uses destination-date parameters and exact calibrated snapshots; scenario thresholds remain fixed. `model_parameters.json` schema 2 adds month mapping and origin-state semantics. The manifest and figure inventory regenerate programmatically. In seasonal outputs the shared key `stationary_wet_probability` denotes horizon-average wet probability, not a homogeneous stationary probability. All 400 sensitivity rows use fixed thresholds and independent replication units with paired draws across scenarios. Timing and platform metadata are not deterministic.


## Cross-platform execution and regression

Local runs locate the repository root and read both unchanged raw snapshots directly; Colab downloads them from the documented raw GitHub URLs. The explicit raw-directory and output-root overrides support isolated local tests. C01 invalidates the completion manifest; C30 regenerates the 72-entry manifest after the full scientific pipeline. The exact target scientific pins are unchanged. The existing S006 reference outputs must be copied to a separate location before rerunning. Use `python verify_reproducibility.py REFERENCE_ROOT REGENERATED_ROOT` from the repository root after C30 finishes. Timing and runtime-version metadata are presence-only; scientific CSV/JSON values and all 32 figure datasets are checked under the documented metric-specific policy. The revised comparator exports all discrepancies and metric-level summaries to a separate report directory. Changed simulated counts or classifications block acceptance pending investigation. No reference is used as scientific input.


The author reports independent Windows Python 3.14 and Google Colab execution of the frozen scientific notebook. A readability diagnostic using Linux Python 3.13.5 and the available pandas 2.2.3 completed all 31 code cells and regenerated the 72 entries: 69 files were byte-identical to the original reference, with differences only in three timing CSVs. The metric-aware verifier accepted the diagnostic with zero REVIEW/FAIL records. The delivered dependency pins are unchanged, including pandas 2.3.3; this diagnostic does not establish fresh exact-pin Windows or Colab execution of the readability revision. See the [user guide](../USER_GUIDE.md) for the independent verification procedure.
