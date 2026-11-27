# User guide

[Project overview](README.md) · [Mathematical model](THEORY.md) · [Data and outputs](data/README.md)

## Run the web simulator

Open the [live web simulator](https://dilaraliyanage.github.io/colombo-rainfall-simulator/) or open `docs/index.html` in a modern browser. All code, styles and scientific parameters are local; no backend, npm, CDN, account or internet connection is needed for simulation after the files are available. The external repository/attribution links require connectivity only if opened. For Pages, configure Settings → Pages → Deploy from a branch → `main` → `/docs`. The author reports successful independent direct-file and live GitHub Pages acceptance testing. For a new source revision, repeat the checks after publishing.

## Controls and reproducible example

1. Choose Seasonal (destination-date NEM/FIM/SWM/SIM) or Homogeneous (constant parameters).
2. Select start date, duration (1–3650 days), and preceding day's state. The default wet origin corresponds to the final calibration state; on other dates it is simply an explicit synthetic initial condition.
3. Select a preset or change the dry-to-wet odds, wet-to-wet odds and Gamma scale multipliers between 0.8 and 1.2. A 20% odds change is not 20 percentage points. Gamma shape, 0.1 mm wet threshold and fixed P95/P99 thresholds remain unchanged.
4. Select the unsigned 32-bit seed (default 42) and speed. Start, Pause, Resume and Run instantly use the same trajectory; speed does not affect random draws. Reset clears the trajectory, retains selected controls and unlocks them. Changing scenario mid-run is disabled. Reset before making changes.
5. Read the daily rainfall plot, state timeline, cumulative rainfall, statistics, analytical risk table and active transition/amount parameters. When days outnumber chart pixels, the daily plot uses maxima within display bins and timeline bins prioritise extreme events; mixed states use grey-blue. The underlying statistics always use all days.

**Verified example:** seasonal baseline, start 2021-01-01, duration 365, preceding state wet, seed 42, all multipliers 1.0. Run instantly. Actual Chromium in-memory run: 312 wet days (85.48%), cumulative 2,828.0 mm (rounded display), mean daily rainfall 7.75 mm, maximum 87.94 mm, 29 P95 and 6 P99 exceedances, longest observed wet/dry spells 125/8 days. These are synthetic results, not observations or forecasts. [Screenshot](docs/screenshots/web-dashboard.png).

## Interpret the results

Single-trajectory statistics are realised frequencies, not analytical probabilities or confidence intervals. The risk table averages calendar-dependent model expectations over the selected horizon and same preceding state; baseline and scenario use the same dates and model. Longest spells include endpoint runs as observed inside the simulated window, unlike the notebook's complete-spell diagnostic. Intensity dominates marginal extreme-event sensitivity in the investigated range; persistence influences clustering. No flood model, climate projection, or operational weather forecast is implied. Historical reanalysis and aggregation uncertainty, Gamma far-tail limitations and first-order spell limitations remain.

## Regenerate the browser parameter asset

The notebook remains authoritative. Run it if scientific outputs need regenerating, then execute from the repository root:

```powershell
python generate_web_parameters.py
```

This standard-library-only conversion reads `data/processed/model_parameters.json`, `analytical_benchmarks.csv`, `seasonal_analytical.csv` and `sensitivity_scenarios.csv`, exports `docs/model-parameters.js` and records the model JSON SHA-256 and Git blob hash. It does not change raw or processed science. Commit the generated JS asset with the app; never transcribe fitted parameters manually. The classic script tags use relative paths and do not use fetch(), so no local JSON CORS request is required.

## Verify the web model

Click **Run model verification** in the Method & guide section. It runs 16 deterministic checks (including 29 distinct shared-input sensitivity fixtures), seven homogeneous and four seasonal analytical/Monte Carlo checks. The total sample is 4,016,000 daily observations, with distinct seeded streams per trajectory and occurrence/intensity/initialisation components. Each comparison requires absolute error ≤ 4 MCSE + 1e-9 using trajectory-level MCSE; the separate analytical calculation must agree with the Python target within atol=1e-9 plus rtol=1e-8. JavaScript and NumPy streams are not expected to be identical. These are implementation checks, not validation against real weather. Verification temporarily pauses a running animation and may briefly block the interface on slower devices.

Actual local evidence: [JS verification](docs/web-verification-results.json), [Chromium UI and verification](docs/web-browser-test-results.json). Both environments passed all model checks; the browser passed 14 UI tests with no uncaught errors. Browser navigation to file:// and localhost was blocked by its administrator policy; the screenshots and interactions were obtained by in-memory rendering of the exact local HTML, CSS and JavaScript assets. The author subsequently reported successful independent local and live deployment checks. To verify offline after an update, disable network access after the files are available, open the local HTML, run both models and the verification button. After Pages deployment, repeat on the expected repository subpath.

## Execute the scientific notebook

Windows: open the repository folder in VS Code, select the named Python 3.14 environment and install `requirements.txt`. Install Jupyter kernel support if not already installed (`python -m pip install ipykernel`). The four scientific pins are NumPy 2.3.5, pandas 2.3.3, SciPy 1.17.0 and Matplotlib 3.10.8. Open the notebook and use Restart Kernel and Run All. The notebook detects its repository root even when the kernel starts in `notebook/`. Existing compatible dependencies are not reinstalled. Raw files are read from `data/raw/`; processed files and figures are overwritten.

Colab: before publishing, open the corrected local notebook file in Colab (upload the notebook itself, not any datasets). After publishing, open it from the GitHub badge. Start a fresh runtime and choose Runtime → Run all. The first code cell installs the exact pins using `%pip`; C01 checks installed and loaded versions and C02 downloads the raw CSV snapshots. No manual data upload, credential or intermediate cell editing is needed on a compatible runtime. If Colab has preloaded an incompatible scientific package, the version check stops execution; restart the session and run all again. The author has subsequently reported successful Google Colab execution of the frozen notebook; unattended execution on other runtime images is not established. Verify actual loaded versions in C01 and `runtime_versions.csv`.

The installation cell precedes C01; all 30 numbered cells execute normally in the same kernel. Run all from a fresh kernel, and stop if any cell fails. C01 invalidates the prior completion manifest after the installation cell returns; if installation itself is interrupted, an old manifest may still be present. Use a fresh output root for acceptance testing and check the actual C30 completion message. Do not delete or reload imported NumPy/pandas modules to work around a version conflict. Colab documents this preloaded-package issue at https://github.com/googlecolab/colabtools/issues/5205. If required, restart the session (not delete the runtime) after installation and run all again. This fallback is not evidence of unattended execution.

The author reports successful Windows Python 3.14 and Google Colab runs of the frozen notebook. A previous conventional Linux diagnostic using pandas 2.2.3 (rather than the target 2.3.3) reproduced all 72 outputs. The latest readability diagnostic repeated that conventional workflow, with all scientific comparisons passing under the available previous pin. These are distinct from exact-pin platform verification. The current delivered notebook keeps the approved dependency pins and does not use custom dispatch.

## Independently compare regenerated outputs

Keep the frozen original S006 reference directory, not a copy of the newly regenerated outputs. It must contain `data/processed/` and `figures/` with the 72-entry completed manifest. Run the comparison only after C30 has completed; reference outputs are not computational inputs. A completed Windows run may be compared immediately without rerunning the notebook.

From the repository root in PowerShell:

```powershell
$reference = Join-Path $HOME "colombo-S006-reference"
python verify_reproducibility.py "$reference" "." --report-dir "$HOME\colombo-regression-S0062"
```

The script automatically checks both original raw files in the regenerated root's `data/raw/`. If the raw input lives elsewhere, provide `--raw-dir` with its directory. A missing raw snapshot blocks acceptance until it can be checked. Choose a **new or empty report directory outside both compared roots** for each run; the default is a new temporary directory. The comparator never writes to scientific inputs or outputs.

For the original strict numerical diagnostic:

```powershell
python verify_reproducibility.py "$reference" "." --strict --report-dir "$HOME\colombo-regression-S0062-strict"
```

`--strict` reapplies rtol=1e-8 and atol=1e-9 to continuous fields and optimisation diagnostics, while retaining the newer structural, raw-data, quality and count checks. It is a diagnostic, not a requirement that platforms have identical numerical optimisation traces.

For Colab, download the completed `data/processed/` and `figures/` directories to a separate local output root. C02 verifies the downloaded raw bytes in memory; retain both C02 checksum outputs as execution evidence. The comparator can also check your local immutable originals using `--raw-dir` (checking these copies alone does not establish what a remote run downloaded):

```powershell
python verify_reproducibility.py "$reference" "$HOME\colombo-colab-verification" --raw-dir ".\data\raw" --report-dir "$HOME\colombo-regression-Colab"
```

Inspect the generated reports even if the console reports PASS:

- `summary.csv`: one row per file and metric/field or figure primitive, with status counts, maximum absolute and relative differences, zero-reference differences, comparison criteria and group outcome.
- `discrepancies.csv`: every nonidentical comparison and every review or failure, including location, reference value, regenerated value, signed delta, absolute and relative differences, applied rule, numerical tolerance and explanatory note. Unchanged runtime-file presence records are also diagnostic entries. No 100-row truncation.
- `result.json`: machine-readable mode, status counts and acceptance indicator.

Exit status 0 means acceptance under the selected policy, 1 means a substantive failure or unresolved review, and 2 means the comparison could not finish or was invoked incorrectly. `EXACT` describes equal parsed values, not necessarily equal file bytes. `VALIDATED` denotes an independent check (for example a SHA-256 match, file presence or a valid optimisation result). `EQUIVALENT` denotes a nonidentical value within its tolerance. `DIAGNOSTIC` identifies allowed optimisation trace differences or excluded platform/timing metadata. `REVIEW` identifies discrete-derived differences or unavailable raw evidence that block acceptance. `FAIL` identifies a broken invariant, invalid quality/structure or a numerical deviation beyond its permitted envelope. Relative differences are measured against the reference magnitude and are undefined at zero; inspect the absolute difference and zero-reference count for those fields.

## Numerical reproducibility policy

Bitwise reproducibility means identical file bytes. Numerical reproducibility means equivalent scientific results under explicitly documented comparison criteria. Floating-point optimisation, CSV formatting and image rasterisation can vary across systems without changing the scientific interpretation. The following verification policy is specific to the existing output schema; unrecognised scientific fields retain the original strict comparison.

For continuous numeric comparisons, use the symmetric condition `abs(a-b) <= max(atol, rtol * max(abs(a), abs(b)))` (not the sum of tolerances). Exact fields compare values directly; CSV numeric values are parsed as Decimal where possible, so equivalent numeric formatting does not change the value. JSON configuration types, labels and structures must also match. The comparator makes no change to the notebook, fitted values or simulation.

| Category | Criterion | Scientific rationale |
|---|---|---|
| Raw source files | Exact SHA-256 of each original snapshot | Scientific inputs must be unchanged. |
| Historical daily records, dates, rainfall values, classifications, observation/transition counts, state labels, row/column schemas, scenario multipliers, seeds, fixed thresholds and configuration | Exact parsed values; exact labels and configuration structure | These are discrete invariants or fixed inputs, not optimisation-dependent quantities. |
| Transition probabilities, occurrence-only statistics, likelihood/AIC/BIC, historical summaries and unclassified scientific numeric fields | rtol=1e-8, atol=1e-9 | Same chronological counts and essentially the same objective must be preserved. This remains the original default tolerance. |
| Fitted shape and scale, including seasonal and alternative distribution fits and model export | rtol=1e-6, atol=0 | Positive parameters need a relative criterion. The reported Windows Gamma relative differences (3.41e-8 and 5.94e-8) are below this candidate envelope. |
| Fit normalisation, fitted CDF/PDF/quantile plotting values and other identified continuous fit-dependent figure primitives | rtol=5e-6, atol=1e-9 for generic fit primitives; 1e-7 mm for fitted amounts | Smooth transforms can amplify parameter drift; keep a small numerical envelope rather than permit broad model changes. |
| Identified analytical probability outputs and probability residuals | rtol=5e-6, atol=1e-7 | A small absolute allowance avoids ill-conditioned relative comparisons near zero. The reported Gamma pair changes analytical P95 by about 5.04e-9 and P99 by about 1.42e-9. The 1e-7 floor is below one daily event in the largest 2,190,000-day verification ensemble; simulated count-backed metrics are checked separately. |
| Identified fit-dependent continuous rainfall estimates | rtol=5e-6, atol=1e-7 mm (or the metric's continuous rainfall units) | Retain numerical precision on amounts, including regenerated trajectory-level means. |
| Continuous rainfall differences, paired mean differences, cancellation-sensitive errors and selected uncertainty summaries | rtol=5e-6, atol=2e-5 in rainfall metric units | Subtracting two approximately 10 mm values each drifting at about 1e-6 can yield absolute differences of order 2e-5 mm near zero. This is far below the historical daily measurement resolution. The same conservative floor is used for aggregate rainfall differences; the relative term scales larger values. |
| Derived relative-error ratios | rtol=5e-6; absolute floor `max(1e-9, 2 * underlying_floor / abs(reference denominator))` where the denominator is available and nonzero | Propagate the absolute residual allowance through the ratio, rather than apply a percentage-unit tolerance to a dimensionless fraction. |
| Analytical annual count expectations | rtol=5e-6, atol=365e-7 events | Annual expectation is a continuous quantity equal to daily risk times 365; observed/simulated integer event totals remain exact. |
| Derived percentage changes | rtol=5e-6, atol=0.001 percentage points | A percentage is scaled by 100, and near-zero differences can otherwise have misleading relative errors. Unperturbed analytical baseline differences use the dedicated zero-residual rule below. |
| Selected log-log convergence slopes | rtol=5e-6, atol=1e-4 | The logarithm magnifies small absolute RMSE differences, particularly at the smallest RMSE. This is a candidate screening allowance, not a new theoretical convergence test. |
| Selected standardised-error plotting coordinates | rtol=5e-6, atol=0.001 MCSE units for F25; identified analytical risk percentages use 1e-5 percentage-point floor | Dividing by small MCSE magnifies floating-point drift. The underlying analytical and simulation CSVs still have their own tighter policies. Historical and discrete plot series use strict or exact checks. |
| Optimisation iterations and gradient norms | Differences recorded as diagnostics in scientific mode; strict comparison in strict mode | Termination traces may vary, but each selected fit must report convergence, finite valid parameters, positive normalisation at most one, 1–3 successful starts, integer iterations in 0–1000, and finite nonnegative infinity-norm gradient divided by sample size at most 1e-6. Successful-start counts themselves must match. Likelihood and information criteria still use strict comparison. The gradient bound is a quality screening rule, not a proof of optimality or a substitute for notebook assertions. |
| Runtime and timing files | Manifest/file presence only | Measured durations and platform package metadata are expected to differ. Verify the actual required package pins from the notebook independently. |
| PNG figures | All 32 present, valid signature/end marker and 300 DPI within 0.1 DPI; compare numerical figure_data.json primitives | Pixel rendering can vary by platform; this is not a complete graphical-rendering or PNG-pixel integrity test. |

These are conservative regression envelopes based on the available reference schema, the reported fit differences and their analytical consequences. They are not uncertainty intervals, new scientific tolerances, or evidence that every cross-platform result has passed. High-tail transforms, standardised errors or cancellation-sensitive outputs outside these envelopes must be investigated individually; do not widen tolerances merely to make a report pass. General strict checks and the original notebook's independent scientific assertions remain unchanged.

### Discrete-event investigation

Historical wet/extreme labels and all exported integer counts are exact. Simulation frequencies, spell statistics and uncertainty summaries based on discrete events retain strict comparison. The verifier additionally reconstructs integer counts for exported trajectory-level holdout rates, aggregate daily/seasonal/annual event rates, convergence-batch occurrence/exceedance rates (using each run's analytical target), and sensitivity scenario means/paired count differences where the denominator is known. Reconstructed counts must lie within 1e-6 of an integer, a numerical grid tolerance, and matching integer counts are required. Changed counts are reported with row, metric, denominator and signed integer difference; they are not treated as continuous optimiser drift. The two exported example trajectories are also inspected day by day for wet-day support and strict P95/P99 classification, even if an amount difference is inside its continuous tolerance. Paired simulation baseline differences retain exact comparison. Only the two continuous analytical baseline fields have the following dedicated rule.

### Analytical baseline floating-point residuals

In `sensitivity_scenarios.csv`, only rows with `k01 = k11 = kbeta = 1` receive the dedicated analytical zero-residual rule: `analytical_delta` uses `rtol=0, atol=1e-12` and `analytical_relative_pct` uses `rtol=0, atol=1e-10` percentage points. Both reference and regenerated values must be finite and individually within the absolute tolerance of zero, and their absolute difference must also be within that tolerance. Identical but materially nonzero values fail. This invariant applies in scientific and strict diagnostic modes; all other comparison rules remain unchanged. It accommodates floating-point cancellation, not changes to the mathematical baseline or discrete event counts.

If `REVIEW` or `FAIL` occurs, inspect the relevant report rows before accepting. Equal aggregate counts do not prove identical classifications on every simulated day: individual full-ensemble event flags are not stored by the current notebook. If an aggregate count or discrete-derived statistic changes, use targeted same-seed replay with the two calibrated parameter sets to identify the affected replication/date, amount and distance from the original fixed threshold. Establish whether a threshold crossing is attributable to negligible continuous drift or to a scientific/implementation error. Do not modify the model or seeds to obtain agreement. Acceptance requires documented resolution, not automatic rounding or blanket tolerances for event counts.

The original notebook's full scientific calculation and its 21 homogeneous tests, seven homogeneous analytical comparisons, 20 seasonal checks, four seasonal analytical comparisons and 400 sensitivity rows remain unchanged. This comparator tests outputs against a frozen reference, rather than rerunning the science.

For isolated local notebook tests, set `RAINFALL_DATA_DIR` and `RAINFALL_OUTPUT_DIR` before starting the kernel. Remove overrides before normal execution.

The author reports successful Windows execution with the target pins and regeneration of all 72 outputs. The original strict utility reported optimisation-dependent differences; the targeted analytical baseline near-zero correction preserves all exact discrete checks. Use the current comparator to evaluate regenerated outputs; retain its report rather than assuming a pass. The comparator was exercised under Linux Python 3.13.5 with reference copies, synthetic drift/corruption fixtures and a complete readability-diagnostic notebook run. The author reports successful Colab notebook execution; the published web implementation is separate from that scientific workflow. The readability revision makes no changes to the numerical policy or dependency pins.
