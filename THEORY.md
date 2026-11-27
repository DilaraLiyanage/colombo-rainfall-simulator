# Theory and mathematics

## Calibrated baseline

Let $R_t$ denote daily rainfall in mm and $S_t=\mathbf{1}(R_t\geq\tau)$ the wet-day indicator for a positive threshold $\tau$ (mm/day). The approved threshold is 0.1 mm; model rainfall is zero on dry days, while original totals are retained.

For the homogeneous first-order baseline, $p_{ij}=P(S_t=j\mid S_{t-1}=i)$, with $i,j\in\{0,1\}$. Estimate $p_{ij}=n_{ij}/\sum_k n_{ik}$ from consecutive valid days only; zero denominators require an explicit policy. Rows sum to one. The fitted row-major counts are (670, 352; 352, 5930). Seasonal destination-date counts partition these counts [1,3,4].

For a homogeneous nondegenerate chain, the stationary wet probability is $\pi_1=p_{01}/(p_{01}+p_{10})$ when the denominator is positive. The fitted stationary wet probability is 0.86007667. Mean state-i spell length is $1/p_{i,1-i}$; dry and wet means are 2.903409 and 17.846591 days.

Conditional wet-day amounts may be sampled from a gamma, mixed exponential or hybrid gamma-GP model [1,2,5,6]. Gamma is the approved baseline; lower-truncated Gamma, exponential and log-normal have been fitted by maximum likelihood. Gamma has the lowest AIC and BIC; tail discrepancies remain. Simulated wet amounts must satisfy the chosen wet-day definition; dry-state amounts require an explicit trace-rain policy.

## Numerical approach

Planned daily discrete-time sampling with seeded pseudorandom numbers; no differential-equation integrator is required. A uniform draw selects the next state from its conditional probabilities. Conditional amounts are sampled separately. For N days and M replications, a first-order implementation requires O(NM) draws, with O(N) storage per replication if processed sequentially.

## Verification and evaluation plan

Check probability bounds and row sums, nonnegative finite rainfall, threshold consistency and deterministic limiting cases. Compare simulated stationary wet frequency with its analytic value for a synthetic homogeneous chain. Use independent replications and a stated tolerance accounting for serial dependence. Calibration probability checks and quadrature checks passed locally; simulation tests are pending.

Compare held-out historical reference statistics with simulated wet frequency, spell lengths, monthly totals, upper quantiles and extreme frequency. Estimate uncertainty across independent replications; for a replicate-level mean use a t interval when justified. Distinguish Monte Carlo uncertainty from parameter and dataset uncertainty. Avoid fitting thresholds on held-out data.

## Assumptions and decisions

Single-location daily scope; no explicit atmospheric dynamics or spatial dependence. Sri Lankan rainfall seasonality and persistence [7] motivate seasonal diagnostics. Reanalysis limitations [8] motivate provenance and local validation. The approved dataset is the Open-Meteo Best Match hourly snapshot. Wet days have at least 0.1 mm; extreme days strictly exceed the all-day calibration P95 of 25.2 mm. Calibration uses 2001–2020 and evaluation uses 2021–2025. No national extreme threshold is transferred to Colombo.

See [REFERENCES.md](REFERENCES.md) for numbered citations.


## Truncation and analytical benchmarks

With fixed threshold $\tau=0.1$ and parent distribution $F_\theta$, the conditional density is $g_\theta(x)=f_\theta(x)/\bar F_\theta(\tau)$ for $x\ge\tau$, zero otherwise. The log-likelihood is $\sum_i\log f_\theta(x_i)-n\log\bar F_\theta(\tau)$. Positive shape and scale parameters are optimised on log scales; parent location is fixed at zero. Gamma shape $\alpha=0.7088471651$, scale $\beta=11.3438189279$ mm. Conditional quantiles are $\bar F_\theta^{-1}((1-u)\bar F_\theta(\tau))$, where the inverse is the inverse survival function, not reciprocal. For later generation this transformation enforces wet-day support without clipping.

For Gamma, $E[X\mid X\ge\tau]=\alpha\beta Q(\alpha+1,\tau/\beta)/Q(\alpha,\tau/\beta)$, where $Q$ is the regularised upper incomplete gamma function. Under stationarity and independent wet-day amounts, $E[R]=\pi_1 E[X\mid X\ge\tau]=7.1895867$ mm/day. For $u\ge\tau$, $P(R>u)=\pi_1\bar F_\theta(u)/\bar F_\theta(\tau)$; this equals 0.05448304 at 25.2 mm and 0.00736983 at 46.296 mm. Quadrature independently checks the conditional mean and survival probabilities. These are model targets, not historical truth or simulation results.

The occurrence BIC uses the same 7304 destination observations for both models, with one parameter for independence and two for first-order dependence. Spell diagnostics exclude the two endpoint runs. BIC preference does not guarantee realistic long spells [3]. Seasonal transitions use destination date without concatenating disjoint intervals. The SWM dry-origin row has just 39 transitions. Gamma underestimates wet-day P99; neither BIC nor continuous likelihood on rounded data proves accurate extremes [2,5,6].

## Reproducibility

The notebook recomputes all estimates and thresholds from immutable raw snapshots. Numbers in this document are reported results, not model inputs. C16 exports the fitted parameters and manifest. For future independent replications, spawn child generators from a single NumPy SeedSequence with seed 42. Simulation is not implemented in this stage.
