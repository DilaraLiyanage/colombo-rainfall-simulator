# Theory and mathematics

## Calibrated baseline

Let $R_t$ denote daily rainfall in mm and $S_t=\mathbf{1}(R_t\geq\tau)$ the wet-day indicator for a positive threshold $\tau$ (mm/day). The approved threshold is 0.1 mm; model rainfall is zero on dry days, while original totals are retained.

For the homogeneous first-order baseline, $p_{ij}=P(S_t=j\mid S_{t-1}=i)$, with $i,j\in\{0,1\}$. Estimate $p_{ij}=n_{ij}/\sum_k n_{ik}$ from consecutive valid days only; zero denominators require an explicit policy. Rows sum to one. The fitted row-major counts are (670, 352; 352, 5930). Seasonal destination-date counts partition these counts [1,3,4].

For a homogeneous nondegenerate chain, the stationary wet probability is $\pi_1=p_{01}/(p_{01}+p_{10})$ when the denominator is positive. The fitted stationary wet probability is 0.86007667. Mean state-i spell length is $1/p_{i,1-i}$; dry and wet means are 2.903409 and 17.846591 days.

Conditional wet-day amounts may be sampled from a gamma, mixed exponential or hybrid gamma-GP model [1,2,5,6]. Gamma is the approved baseline; lower-truncated Gamma, exponential and log-normal have been fitted by maximum likelihood. Gamma has the lowest AIC and BIC; tail discrepancies remain. Simulated wet amounts must satisfy the chosen wet-day definition; dry-state amounts require an explicit trace-rain policy.

## Numerical approach

Implemented daily discrete-time sampling with seeded pseudorandom numbers; no differential-equation integrator is required. A uniform draw selects the next state from its conditional probabilities. Conditional amounts are sampled separately. For N days and M replications, a first-order implementation requires O(NM) draws, with O(N) storage per replication if processed sequentially.

## Verification and evaluation plan

Check probability bounds and row sums, nonnegative finite rainfall, threshold consistency and deterministic limiting cases. Compare simulated stationary wet frequency with its analytic value for a synthetic homogeneous chain. Use independent replications and a stated tolerance accounting for serial dependence. Calibration probability checks and quadrature checks passed locally; homogeneous simulation tests are implemented and passed locally.

Compare held-out historical reference statistics with simulated wet frequency, spell lengths, monthly totals, upper quantiles and extreme frequency. Estimate uncertainty across independent replications; for a replicate-level mean use a t interval when justified. Distinguish Monte Carlo uncertainty from parameter and dataset uncertainty. Avoid fitting thresholds on held-out data.

## Assumptions and decisions

Single-location daily scope; no explicit atmospheric dynamics or spatial dependence. Sri Lankan rainfall seasonality and persistence [7] motivate seasonal diagnostics. Reanalysis limitations [8] motivate provenance and local validation. The approved dataset is the Open-Meteo Best Match hourly snapshot. Wet days have at least 0.1 mm; extreme days strictly exceed the all-day calibration P95 of 25.2 mm. Calibration uses 2001–2020 and evaluation uses 2021–2025. No national extreme threshold is transferred to Colombo.

See [REFERENCES.md](REFERENCES.md) for numbered citations.


## Truncation and analytical benchmarks

With fixed threshold $\tau=0.1$ and parent distribution $F_\theta$, the conditional density is $g_\theta(x)=f_\theta(x)/\bar F_\theta(\tau)$ for $x\ge\tau$, zero otherwise. The log-likelihood is $\sum_i\log f_\theta(x_i)-n\log\bar F_\theta(\tau)$. Positive shape and scale parameters are optimised on log scales; parent location is fixed at zero. Gamma shape $\alpha=0.7088471651$, scale $\beta=11.3438189279$ mm. Conditional quantiles are $\bar F_\theta^{-1}((1-u)\bar F_\theta(\tau))$, where the inverse is the inverse survival function, not reciprocal. For stochastic generation this transformation enforces wet-day support without clipping.

For Gamma, $E[X\mid X\ge\tau]=\alpha\beta Q(\alpha+1,\tau/\beta)/Q(\alpha,\tau/\beta)$, where $Q$ is the regularised upper incomplete gamma function. Under stationarity and independent wet-day amounts, $E[R]=\pi_1 E[X\mid X\ge\tau]=7.1895867$ mm/day. For $u\ge\tau$, $P(R>u)=\pi_1\bar F_\theta(u)/\bar F_\theta(\tau)$; this equals 0.05448304 at 25.2 mm and 0.00736983 at 46.296 mm. Quadrature independently checks the conditional mean and survival probabilities. These are model targets, not historical truth or simulation results.

The occurrence BIC uses the same 7304 destination observations for both models, with one parameter for independence and two for first-order dependence. Spell diagnostics exclude the two endpoint runs. BIC preference does not guarantee realistic long spells [3]. Seasonal transitions use destination date without concatenating disjoint intervals. The SWM dry-origin row has just 39 transitions. Gamma underestimates wet-day P99; neither BIC nor continuous likelihood on rounded data proves accurate extremes [2,5,6].

## Reproducibility

The notebook recomputes all estimates and thresholds from immutable raw snapshots. Numbers in this document are reported results, not model inputs. C16 exports fitted parameters; C23 finalises the manifest after simulation. All scientific data originate from the raw snapshots. Namespaced SeedSequence children use seed 42. Seasonal simulation is implemented; browser simulation is deferred.


## Homogeneous simulation and initialisation

C17 implements the first-order transition by drawing $U_t\sim\mathcal{U}(0,1)$ and setting $S_t=\mathbf{1}(U_t<p_{S_{t-1},1})$. For wet days, an independent $V_t\sim\mathcal{U}(0,1)$ gives $X_t=\beta Q^{-1}(\alpha,(1-V_t)Q(\alpha,\tau/\beta))$, using the inverse regularised Gamma survival function. The endpoint $V_t=0$ maps exactly to $\tau$; no ordinary Gamma samples are clipped. Dry-day rainfall is zero. Stationary verification samples the origin state from the unique stationary law. Explicit initialisation specifies the preceding day's state, then transitions into the first simulated day. A matrix with two absorbing states has no unique stationary law, so an explicit origin is required. A periodic alternating chain has a unique stationary law but may not converge from an arbitrary initial state. C18 exercises absorbing, alternating and independent Bernoulli cases, validates domain/support and tests the inverse-survival identity. Complete spells exclude both potentially censored endpoints.

The simulator vectorises over trajectories while stepping chronologically over days. For $N$ independent trajectories of length $T$, state generation and amount generation are $O(NT)$, with $O(NT)$ memory for one batch. Experiment namespaces separate tests, stationary verification, convergence, holdout and annual uncertainty. Independent child generators are allocated by SeedSequence rather than repeatedly resetting a shared seed.

## Monte Carlo verification, uncertainty and convergence

For trajectory statistic $Y_i$, estimate $\mu$ with $\bar Y=N^{-1}\sum_iY_i$, $\operatorname{MCSE}=s_Y/\sqrt N$, and a Student-t 95% interval $\bar Y\pm t_{0.975,N-1}s_Y/\sqrt N$. Empirical 2.5th and 97.5th percentiles of trajectory statistics estimate prediction intervals. These condition on fixed fitted parameters, not daily independence or parameter-estimation/reanalysis uncertainty. Annual event indicators from separate independent annual trajectories use exact binomial confidence intervals. A degenerate empirical interval for a binary indicator does not imply certainty.

C19 compares the seven independently derived stationary targets with 600 independent trajectories of 3,650 days. Acceptance is absolute error at most $4\operatorname{MCSE}+10^{-9}$. A normal approximation gives a conservative family-wise false-rejection bound below 0.05% for seven comparisons when estimator bias is negligible. Finite complete-spell averages can be biased by endpoint censoring and random spell counts; long trajectories reduce that effect. The band is not a proof of correctness; limiting tests and quadrature provide independent checks. All seven comparisons passed locally.

C20 independently repeats each $N\in\{25,50,100,250,500,1000\}$ for 20 batches of fixed 365-day duration. $\operatorname{RMSE}(N)=\sqrt{B^{-1}\sum_{b=1}^B(\hat\mu_{b,N}-\mu)^2}$ and MAE are computed across batches. A log-log least-squares slope estimates the expected $-1/2$ convergence rate. Empirical slopes were −0.573, −0.484 and −0.471 for wet probability, mean rainfall and P95 exceedance. Finite batch counts cause deviations; individual realised errors need not decrease monotonically. Timing is machine dependent.

## Holdout validation and limitations

C21 generates 1,000 independent 1,826-day trajectories with the 2021–2025 calendar (including the 2024 leap day), initialised with the last calibration state. Parameters and P95/P99 thresholds remain fixed. Evaluate monthly, annual, seasonal, spell and exceedance distributions rather than date-by-date forecast RMSE. Monthly climatology is the average of each calendar month's total across five years within each trajectory. Annual totals and maxima are calendar-year summaries. Annual-event comparisons per year use independent trajectories; the five-year average is a trajectory-level statistic, whose all-success sample can yield a degenerate t interval. The separate annual experiment reports exact binomial uncertainty. The observed P95 frequency 8.1599% falls outside the simulated 4.4359–6.4622% interval; historical maximum complete wet spell is 254 days against a predicted 56–142 days. Gamma tail underestimation, homogeneous seasonality and one-day memory are structural limitations, not grounds for holdout tuning. Historical aggregates are from the approved reconstructed dataset, not independent gauge truth. Rainfall exceedance alone does not quantify flood risk.

## Calendar-dependent model and controlled sensitivity

C24 uses destination-date seasonal parameters, preserving the previous state across boundaries. For $\pi_t=\pi_{t-1}P_t$, horizon-average wet probability is $T^{-1}\sum_t\pi_{t,1}$. Mean rainfall and exceedance are the averages of $\pi_{t,1}E[X_t\mid X_t\geq\tau]$ and $\pi_{t,1}\bar F_t(u)/\bar F_t(\tau)$. The preceding calibration state is used; no annual stationary approximation is made. C25 verifies four analytical expectations and deterministic boundaries including leap day and exact reduction to homogeneous parameters. C26–C27 compare equal-sized paired ensembles with the original holdout; the seasonal extension was predefined, and the earlier holdout findings are visible but are not used to refit.

C28 scales odds as $p'=kp/(1-p+kp)$, updates complements, and scales Gamma intensity as $\beta'=k\beta$. Thresholds and shape remain fixed. For stationary scenario $P$, conditional exceedance $r$, and $D$ days, the no-event probability is $\pi(P\operatorname{diag}(1,1-r))^D\mathbf{1}$. Expected annual count is $D\pi_1r$. Paired differences use independent trajectory units with shared uniforms between scenarios, and exact binomial intervals for annual marginal event indicators. Complete-spell means exclude censored endpoints; degenerate paired intervals do not establish certainty. A 20% Gamma scale increase raises marginal P95 risk by about 49.9%, while a 20% increase in wet persistence odds increases the theoretical wet spell from 17.85 to 21.22 days. No causal intervention or climate projection is implied.
