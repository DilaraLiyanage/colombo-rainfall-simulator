# Colombo Rainfall Simulator

A calibrated stochastic daily rainfall generator for exploring rainfall variability and persistence in Colombo, Sri Lanka.

[Live demo (pending deployment)](https://dilaraliyanage.github.io/colombo-rainfall-simulator/) · [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/DilaraLiyanage/colombo-rainfall-simulator/blob/main/notebook/colombo-rainfall-simulator.ipynb)

**Screenshot:** Pending implementation and capture; see [figure inventory](figures/README.md).

## The problem

How do rainfall occurrence patterns and intensity influence the probability of extreme rainfall events in Colombo? Synthetic sequences may support exploratory risk analysis, but are not operational forecasts.

## Quick start

Open the notebook using the badge after publication, then select Runtime → Run all. The notebook retrieves immutable snapshots from `data/raw/`, checks their SHA-256 values, reconstructs rainfall, calibrates all parameters, runs independent Monte Carlo verification and convergence experiments, evaluates the historical holdout, and regenerates all scientific outputs. No existing processed CSV, fitted parameters or figures are inputs. See [data instructions](data/README.md), [manifest](data/processed/output_manifest.csv) and [figure inventory](figures/README.md).

C01 checks the four scientific pins in `requirements.txt`. With matching installed and loaded versions it runs directly. If scientific imports are stale it starts a fresh interpreter; if installed versions differ it creates a temporary environment and installs exact pins there, then starts a fresh worker. The `%%scientific` cell magic dispatches cells to the appropriate interpreter and forwards tables and figures. No manual session restart is intended. Scientific imports and installed versions must match the pins. Local tests used already-installed dependencies; the fresh-install branch and remote retrieval in Colab remain unverified. A new interactive cell can start with `%%scientific` to inspect the scientific namespace.

Two local notebook runs (direct and fresh worker) completed in 50.13 s and 49.57 s including kernel startup; all 50 non-timing outputs were byte-identical. The two timing files differed as expected. Python 3.13.5 and the pinned scientific dependencies were used. See [runtime versions](data/processed/runtime_versions.csv) and [execution runtime](data/processed/execution_runtime.csv). The browser status page remains a placeholder.

## Using the demo

The current page is a status screen. Simulation controls and outputs are intentionally unavailable. See [USER_GUIDE.md](USER_GUIDE.md).

## Model and mathematics

The calibrated homogeneous first-order occurrence model uses $P_{ij}=P(S_t=j\mid S_{t-1}=i)$ for dry/wet states, followed by conditional sampling of wet-day amounts. Wet amounts use a lower-truncated Gamma baseline (shape 0.708847, scale 11.343819 mm); exponential and log-normal alternatives were compared. Seasonal parameters are prepared but not simulated. See [THEORY.md](THEORY.md).

## Verification

Preprocessing, calibration and quadrature assertions passed. All 21 deterministic/domain/reproducibility checks passed, and all seven stationary analytical benchmarks passed the four-MCSE tolerance using 600 independent 3,650-day trajectories. See [simulation checks](data/processed/simulation_verification.csv), [analytical comparisons](data/processed/monte_carlo_analytical.csv), [F16](figures/F16_analytical_verification.png) and [F17](figures/F17_convergence.png). Twenty independent batches at each of six replication counts yielded log-log RMSE slopes of −0.573 (wet probability), −0.484 (mean rainfall) and −0.471 (P95 exceedance). This verifies the numerical implementation, not the real-world adequacy of the model. Independent fresh Colab testing remains pending.

## Concepts applied

Concepts: stochastic processes for occurrence, conditional probability for transitions, random variate generation for amounts, Monte Carlo replication for uncertainty, parameter estimation and statistical model verification.

## Results, limitations and future work

The Gamma baseline gives the lowest AIC/BIC among the compared wet-day distributions, but underestimates the far upper tail. The stationary analytical P95 risk is 5.4483%; the Monte Carlo estimate is 5.4398%. The independent 2021–2025 holdout ensemble (1,000 five-year trajectories, initialised from the final calibration state) estimates P95 frequency at 5.4338% versus 8.1599% historically, outside the 95% prediction interval of 4.4359–6.4622%. Historical mean daily rainfall and wet frequency also exceed their simulated intervals. The historical maximum complete wet spell is 254 days versus a simulated 95% interval of 56–142 days. Seasonal means and risks are not reproduced by the homogeneous model; no holdout values were used to refit parameters. See [holdout comparisons](data/processed/holdout_comparison.csv), [F20](figures/F20_monthly_holdout.png) and [F23](figures/F23_holdout_intervals.png).

The model separates occurrence from conditional intensity: $P(R>u)=\pi_1P(X>u\mid S=1)$. Dependence affects clustering, and Gamma parameters affect wet-day tail risk. This is a marginal-risk decomposition, not a causal finding. Prediction intervals describe trajectory variability; confidence intervals quantify Monte Carlo uncertainty conditional on fitted parameters. Reanalysis, parameter and structural uncertainty are not included. The 0.1 mm wet threshold, calibration all-day P95/P99, calibration/evaluation split and midnight correction remain unchanged. Best Match provenance and the aggregation discrepancy are unresolved. This simulator is neither a deterministic weather forecast nor a flood prediction system. Seasonal simulation, sensitivity experiments and the interactive browser simulator remain future work.

## Key references

- R. D. Stern and R. Coe, “A model fitting analysis of daily rainfall data,” Journal of the Royal Statistical Society: Series A, vol. 147, no. 1, pp. 1–34, 1984. https://academic.oup.com/jrsssa/article/147/1/1/7106047
- S. Wilson Kemsley, T. J. Osborn, S. Dorling, C. Wallace, and J. Parker, “Selecting Markov chain orders for generating daily precipitation series across different Köppen climate regimes,” International Journal of Climatology, accepted manuscript, 2021. https://doi.org/10.1002/joc.7175
- H. G. Jin, S. Hong, and Y. Kim, “Synthetic rainfall modeling using a modified hybrid gamma-GP distribution,” Applied Sciences, vol. 15, art. 9563, 2025. https://doi.org/10.3390/app15179563
- A. Deoras, A. G. Turner, K. M. R. Hunt, and I. M. S. P. Jayawardena, “The influence of weather patterns and the Madden-Julian Oscillation on extreme precipitation over Sri Lanka,” Geophysical Research Letters, vol. 50, e2023GL103727, 2023. https://doi.org/10.1029/2023GL103727

Full list: [REFERENCES.md](REFERENCES.md).

## AI assistance

AI assisted with the initial scaffold, literature summaries, preprocessing, exploratory analysis, path corrections, calibration, likelihood diagnostics, analytical checks, homogeneous simulation, convergence, holdout evaluation and dependency bootstrap corrections. Author review, modifications and independent verification of this update remain pending.

## Licence and credits

Code: [MIT](LICENSE). Dataset attribution and redistribution status: [data/README.md](data/README.md). Weather data are separately licensed under CC BY 4.0; see source credits and provenance limitations before redistribution.
