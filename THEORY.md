# Theory and mathematics

## Candidate model

Let $R_t$ denote daily rainfall in mm and $S_t=\mathbf{1}(R_t\geq\tau)$ the wet-day indicator for a positive threshold $\tau$ (mm/day). The threshold is pending; the treatment of trace rainfall must be documented consistently in fitting and evaluation.

For a candidate first-order chain, $p_{ij}=P(S_t=j\mid S_{t-1}=i)$, with $i,j\in\{0,1\}$. Estimate $p_{ij}=n_{ij}/\sum_k n_{ik}$ from consecutive valid days only; zero denominators require an explicit policy. Rows sum to one. Seasonal grouping and chain order remain subject to evaluation [1,3,4].

For a homogeneous nondegenerate chain, the stationary wet probability is $\pi_1=p_{01}/(p_{01}+p_{10})$ when the denominator is positive. This is a candidate analytic verification target, not a fitted result.

Conditional wet-day amounts may be sampled from a gamma, mixed exponential or hybrid gamma-GP model [1,2,5,6]. The distribution, fitting method and treatment of the lower threshold are pending. Simulated wet amounts must satisfy the chosen wet-day definition; dry-state amounts require an explicit trace-rain policy.

## Numerical approach

Planned daily discrete-time sampling with seeded pseudorandom numbers; no differential-equation integrator is required. A uniform draw selects the next state from its conditional probabilities. Conditional amounts are sampled separately. For N days and M replications, a first-order implementation requires O(NM) draws, with O(N) storage per replication if processed sequentially.

## Verification and evaluation plan

Check probability bounds and row sums, nonnegative finite rainfall, threshold consistency and deterministic limiting cases. Compare simulated stationary wet frequency with its analytic value for a synthetic homogeneous chain. Use independent replications and a stated tolerance accounting for serial dependence. No test has yet been executed.

Compare held-out historical reference statistics with simulated wet frequency, spell lengths, monthly totals, upper quantiles and extreme frequency. Estimate uncertainty across independent replications; for a replicate-level mean use a t interval when justified. Distinguish Monte Carlo uncertainty from parameter and dataset uncertainty. Avoid fitting thresholds on held-out data.

## Assumptions and decisions

Single-location daily scope; no explicit atmospheric dynamics or spatial dependence. Sri Lankan rainfall seasonality and persistence [7] motivate seasonal diagnostics. Reanalysis limitations [8] motivate provenance and local validation. Final dataset, wet-day threshold, amount distribution and extreme threshold remain pending. No national extreme threshold is transferred to Colombo.

See [REFERENCES.md](REFERENCES.md) for numbered citations.
