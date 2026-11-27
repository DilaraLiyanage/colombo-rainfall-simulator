# Colombo Rainfall Simulator

A planned stochastic daily rainfall generator for exploring rainfall variability and persistence in Colombo, Sri Lanka.

[Live demo (pending deployment)](https://dilaraliyanage.github.io/colombo-rainfall-simulator/) · [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/DilaraLiyanage/colombo-rainfall-simulator/blob/main/notebook/colombo-rainfall-simulator.ipynb)

**Screenshot:** Pending implementation and capture; see [figure inventory](figures/README.md).

## The problem

How do rainfall occurrence patterns and intensity influence the probability of extreme rainfall events in Colombo? Synthetic sequences may support exploratory risk analysis, but are not operational forecasts.

## Quick start

Open the notebook using the badge after publication, then select Runtime → Run all. The notebook loads immutable snapshots from `data/raw/`, validates and preprocesses them, writes CSVs to `data/processed/` and figures to `figures/`. See [data instructions](data/README.md). No simulation runs. Open `docs/index.html` locally or use the live link after deployment. Runtime benchmarking is pending.

## Using the demo

The current page is a status screen. Simulation controls and outputs are intentionally unavailable. See [USER_GUIDE.md](USER_GUIDE.md).

## Model and mathematics

A candidate occurrence model uses $P_{ij}=P(S_t=j\mid S_{t-1}=i)$ for dry/wet states, followed by conditional sampling of wet-day amounts. Model order and seasonal grouping require evaluation. See [THEORY.md](THEORY.md).

## Verification

Pending: transition probability checks, limiting cases and comparison with analytic or synthetic reference values. No checks of simulation correctness have been executed. Verification figure pending.

## Concepts applied

Planned concepts: stochastic processes for occurrence, conditional probability for transitions, random variate generation for amounts, Monte Carlo replication for uncertainty, parameter estimation and statistical model verification.

## Results, limitations and future work

Historical preprocessing and exploratory analysis are complete locally; simulation results are pending. Gridded reanalysis may differ from local gauge measurements; short-memory models may miss persistent events and heavy tails. Use Open-Meteo Best Match hourly data, a 0.1 mm wet-day threshold, a Gamma baseline and strict exceedance of the calibration all-day P95 (25.2 mm). Calibration is 2001–2020; evaluation is 2021–2025. Evaluate seasonal and tail behaviour before release.

## Key references

- R. D. Stern and R. Coe, “A model fitting analysis of daily rainfall data,” Journal of the Royal Statistical Society: Series A, vol. 147, no. 1, pp. 1–34, 1984. https://academic.oup.com/jrsssa/article/147/1/1/7106047
- S. Wilson Kemsley, T. J. Osborn, S. Dorling, C. Wallace, and J. Parker, “Selecting Markov chain orders for generating daily precipitation series across different Köppen climate regimes,” International Journal of Climatology, accepted manuscript, 2021. https://doi.org/10.1002/joc.7175
- H. G. Jin, S. Hong, and Y. Kim, “Synthetic rainfall modeling using a modified hybrid gamma-GP distribution,” Applied Sciences, vol. 15, art. 9563, 2025. https://doi.org/10.3390/app15179563
- A. Deoras, A. G. Turner, K. M. R. Hunt, and I. M. S. P. Jayawardena, “The influence of weather patterns and the Madden-Julian Oscillation on extreme precipitation over Sri Lanka,” Geophysical Research Letters, vol. 50, e2023GL103727, 2023. https://doi.org/10.1029/2023GL103727

Full list: [REFERENCES.md](REFERENCES.md).

## AI assistance

AI assisted with the initial scaffold, literature summaries, preprocessing, exploratory analysis and path corrections. Author review, modifications and verification are pending.

## Licence and credits

Code: [MIT](LICENSE). Dataset attribution and redistribution status: [data/README.md](data/README.md). Weather data are separately licensed under CC BY 4.0; see source credits and provenance limitations before redistribution.
