"""Compare completed rainfall output roots; never modify scientific inputs or outputs."""
from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from datetime import date, timedelta
import hashlib
import json
import math
from pathlib import Path
import struct
import tempfile
from collections import Counter, defaultdict

RTOL, ATOL = 1e-8, 1e-9
EXPECTED_OUTPUTS, EXPECTED_FIGURES = 72, 32
MANIFEST = 'data/processed/output_manifest.csv'
FIGURE_DATA = 'data/processed/figure_data.json'
METADATA = {
    'data/processed/runtime_versions.csv',
    'data/processed/execution_runtime.csv',
    'data/processed/seasonal_execution_runtime.csv',
    'data/processed/convergence_timing.csv',
}
RAW_HASHES = {
    'open-meteo-6.92N79.91E4m-hourly.csv': 'd14a8d9739fdf5337172a82b28226fa446af02919a92dfbef8cc52701d5d9601',
    'open-meteo-6.92N79.91E4m-daily.csv': 'dc672e756178597e04c779eddee2003ae4312003578ea85d0f1730aa5c5fdcda',
}
FIT_FILES = {'distribution_fits.csv', 'seasonal_parameters.csv'}
DAILY_FILES = {'processed_daily.csv', 'calibration_daily.csv', 'evaluation_daily.csv'}
LABELS = {'', 'axis', 'method', 'metric', 'distribution', 'season', 'scenario',
          'date', 'split', 'group', 'model', 'test', 'outcome', 'ci_method',
          'converged', 'passed', 'inside_pi', 'is_wet', 'is_extreme'}
COUNTS = {'n', 'count', 'days', 'material_days', 'complete_spells', 'max_days',
          'from_state', 'to_state', 'state', 'year', 'month', 'order', 'parameters',
          'replications', 'batch', 'paired_n', 'successful_starts',
          'n00', 'n01', 'n10', 'n11'}
STRICT_COLUMNS = {'log_likelihood', 'AIC', 'BIC', 'p00', 'p01', 'p10', 'p11',
                  'probability', 'observed_mm', 'observed_wet_exceedance',
                  'historical', 'historical_calibration', 'empirical_mean_days',
                  'median_days', 'p95_days', 'theoretical_mean_days'}
EXACT_CONFIG = {'k01', 'k11', 'kbeta', 'quantile', 'threshold_mm'}
AMOUNT_METRICS = {'expected_daily_mm', 'mean_wet_mm', 'annual_total_mm',
                  'mean_annual_total_mm', 'annual_maximum_mm',
                  'mean_annual_maximum_mm', 'monthly_total_mm', 'season_daily_mm'}
EVENT_METRICS = {'daily_P95_exceedance', 'daily_P99_exceedance',
                 'season_P95_frequency', 'season_P99_frequency',
                 'annual_count_P95', 'annual_count_P99', 'annual_event_P95',
                 'annual_event_P99', 'annual_probability_at_least_one_P95',
                 'annual_probability_at_least_one_P99'}
OCCURRENCE_METRICS = {'stationary_wet_probability', 'season_wet_frequency'}


@dataclass(frozen=True)
class Rule:
    name: str
    rtol: float = 0.0
    atol: float = 0.0
    kind: str = 'numeric'


EXACT = Rule('exact_value', kind='exact')
BASELINE_DELTA = Rule('analytical_baseline_zero', 0.0, 1e-12, 'baseline_zero')
BASELINE_PERCENT = Rule('analytical_baseline_zero', 0.0, 1e-10, 'baseline_zero')
STRICT = Rule('strict_numeric', RTOL, ATOL)
PARAMETER = Rule('fitted_parameter', 1e-6, 0.0)
FIT_DERIVED = Rule('continuous_fit_derived', 5e-6, 1e-9)
PROBABILITY = Rule('analytical_probability', 5e-6, 1e-7)
AMOUNT = Rule('continuous_rainfall_mm', 5e-6, 1e-7)
DAILY_DELTA = Rule('rainfall_difference_mm', 5e-6, 2e-5)
PERCENT_DELTA = Rule('derived_relative_percent', 5e-6, 1e-3)
COUNT_DELTA = Rule('analytical_annual_count', 5e-6, 365e-7)
DIAGNOSTIC = Rule('optimisation_diagnostic', kind='diagnostic')
RUNTIME_METADATA = Rule('platform_metadata_presence', kind='diagnostic')
DISCRETE = Rule('discrete_statistic_review', RTOL, ATOL, 'review')
EVENT_COUNT = Rule('reconstructed_count', kind='review')


def read_csv(path: Path) -> tuple[list[str], list[list[str]]]:
    with path.open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.reader(stream))
    if not rows:
        raise ValueError(f'Empty CSV: {path}')
    return rows[0], rows[1:]


def numeric_cell(value: str):
    """Decimal retains exact historical values and counts despite CSV formatting."""
    if not value:
        return value
    try:
        return Decimal(value)
    except InvalidOperation:
        return value


def is_number(value) -> bool:
    return isinstance(value, (int, float, Decimal)) and not isinstance(value, bool)


def is_finite(value) -> bool:
    return is_number(value) and math.isfinite(value)


def is_event(metric: str) -> bool:
    return metric in EVENT_METRICS


def is_occurrence(metric: str) -> bool:
    return metric in OCCURRENCE_METRICS or 'spell' in metric


def error_ratio_rule(row: dict, floor: float) -> Rule:
    """Bound cancellation in dimensionless ratios using their reference denominator."""
    denominator = abs(float(row.get('analytical', row.get('historical', 0)) or 0))
    return Rule('derived_error_ratio', 5e-6, max(ATOL, 2 * floor / denominator)) if denominator else STRICT


def csv_rule(filename: str, column: str, row: dict) -> Rule:
    """Only known fit-dependent fields receive expanded tolerances."""
    metric = row.get('metric', column)
    if filename in DAILY_FILES or column in LABELS | COUNTS | EXACT_CONFIG:
        return EXACT
    if filename in FIT_FILES:
        if column in {'iterations', 'gradient_inf_norm'}:
            return DIAGNOSTIC
        if column in {'shape', 'scale_mm'}:
            return PARAMETER
        if column == 'normalisation':
            return FIT_DERIVED
    if column in STRICT_COLUMNS:
        return STRICT
    if filename == 'summary.csv' and row.get('') in {'days', 'wet_days', 'extreme_days'}:
        return EXACT
    if filename == 'distribution_quantiles.csv':
        return DAILY_DELTA if column == 'error_mm' else AMOUNT
    if filename == 'distribution_tail_errors.csv':
        return PROBABILITY
    if filename == 'sensitivity_scenarios.csv':
        if column == 'beta_mm':
            return PARAMETER
        if all(Decimal(row[k]) == 1 for k in ('k01', 'k11', 'kbeta')):
            # Analytical cancellation can leave roundoff at a mathematically zero baseline.
            if column == 'analytical_delta':
                return BASELINE_DELTA
            if column == 'analytical_relative_pct':
                return BASELINE_PERCENT
            if column in {'paired_delta', 'paired_relative_pct', 'paired_ci_low', 'paired_ci_high'}:
                return EXACT
    if filename in {'analytical_benchmarks.csv', 'seasonal_daily_expectations.csv'}:
        if is_occurrence(metric):
            return STRICT
        return AMOUNT if metric in AMOUNT_METRICS else PROBABILITY
    if filename in {'monte_carlo_analytical.csv', 'seasonal_analytical.csv'}:
        if is_occurrence(metric):
            return DISCRETE
        if is_event(metric):
            if column in {'analytical', 'absolute_error', 'relative_error'}:
                return error_ratio_rule(row, PROBABILITY.atol) if column == 'relative_error' else PROBABILITY
            return DISCRETE
        if metric in AMOUNT_METRICS:
            if column in {'absolute_error', 'relative_error', 'tolerance', 'mcse'}:
                return error_ratio_rule(row, DAILY_DELTA.atol) if column == 'relative_error' else DAILY_DELTA
            return AMOUNT
    if filename in {'convergence_batches.csv', 'convergence_results.csv', 'convergence_slopes.csv'}:
        if is_occurrence(metric):
            return DISCRETE
        if is_event(metric):
            if column in {'error', 'mae', 'rmse'}:
                return PROBABILITY
            if column == 'slope':
                # A small change in a tiny RMSE is magnified by log regression.
                return Rule('derived_log_slope', 5e-6, 1e-4)
            return DISCRETE
        if metric in AMOUNT_METRICS:
            if column == 'slope':
                return Rule('derived_log_slope', 5e-6, 1e-4)
            return DAILY_DELTA
    if filename in {'annual_simulation_uncertainty.csv', 'holdout_comparison.csv',
                    'seasonal_holdout.csv', 'comparative_holdout.csv',
                    'holdout_trajectory_statistics.csv', 'comparative_paired.csv',
                    'holdout_aggregate_errors.csv', 'comparative_errors.csv',
                    'sensitivity_scenarios.csv'}:
        if is_occurrence(metric) or is_event(metric):
            if filename == 'sensitivity_scenarios.csv' and is_event(metric) and column.startswith('analytical'):
                if column.endswith('_pct'):
                    return PERCENT_DELTA
                return COUNT_DELTA if metric.startswith('annual_count') else PROBABILITY
            return DISCRETE
        if metric in AMOUNT_METRICS:
            if column == 'relative_error':
                return error_ratio_rule(row, DAILY_DELTA.atol)
            if column.endswith('_pct'):
                return PERCENT_DELTA
            if column in {'paired_delta', 'paired_ci_low', 'paired_ci_high',
                          'analytical_delta', 'absolute_error', 'mae', 'rmse',
                          'mcse'} or filename == 'comparative_paired.csv':
                # Allow cancellation on daily amounts; aggregate totals use
                # relative tolerance plus a daily-scale floor.
                return DAILY_DELTA
            return AMOUNT
    return STRICT


def json_rule(filename: str, keys: tuple) -> Rule:
    if filename in {'simulation_config.json', 'seasonal_sensitivity_config.json'}:
        return EXACT
    if filename == 'model_parameters.json':
        if keys[-1:] in {('shape',), ('scale_mm',)}:
            return PARAMETER
        if 'transition_matrix' in keys or 'stationary_distribution' in keys:
            return STRICT
        return EXACT
    if filename != 'figure_data.json' or len(keys) < 3:
        return EXACT
    # Figure primitives are not labelled by physical variable. Protect known
    # historical/occurrence plots and axes; continuous curves use bounded drift.
    number = str(keys[0])[:3]
    if number == 'F01':
        return EXACT
    if number in {'F02', 'F03', 'F04', 'F05', 'F06', 'F07', 'F08',
                  'F09', 'F14', 'F21', 'F22', 'F27', 'F28', 'F32'}:
        return STRICT
    if len(keys) >= 5 and keys[2] == 'lines':
        line, coordinate = keys[3:5]
        if number in {'F15', 'F24'} and line == 0 and coordinate == 0:
            return EXACT
        if number in {'F15', 'F24'} and line == 1:
            return EXACT
        if number in {'F17', 'F18', 'F19', 'F20', 'F26'} and coordinate == 0:
            return EXACT
        if number in {'F10', 'F11', 'F13', 'F30'} and coordinate == 0:
            return STRICT
        if number in {'F11', 'F13'} and line == 0:
            return STRICT
        if (number in {'F19', 'F20'} and line == 1) or (number == 'F26' and line == 2):
            return STRICT
        if number == 'F30' and line != 0:
            return STRICT
        if number == 'F13' and line >= 4:
            return EXACT
    if number == 'F10' and 'rectangles' in keys:
        return STRICT
    if number == 'F12' and 'collections' in keys and keys[-1] == 1:
        return STRICT  # observed quantiles, not theoretical quantiles
    if number == 'F18' and keys[1] in {0, 2}:
        return STRICT  # P95 and occurrence interval widths
    if len(keys) > 2 and number in {'F16', 'F23', 'F25'} and keys[2] in {'collections', 'collection_segments', 'collection_paths'}:
        if keys[-1] == (0 if number == 'F25' else 1):
            return STRICT  # category/index coordinate, not calculated ratio
    if number == 'F25':
        if len(keys) > 3 and keys[2] == 'lines' and keys[3] >= 1:
            return STRICT  # zero and four-MCSE reference lines
        return Rule('standardised_error_plot', 5e-6, 1e-3)
    if number in {'F15', 'F24', 'F19', 'F20', 'F26', 'F29'}:
        return AMOUNT
    if number == 'F17':
        return DAILY_DELTA if keys[1] == 1 else PROBABILITY
    if number == 'F30' and ('collection_segments' in keys or 'collection_paths' in keys):
        return STRICT  # simulated P95 uncertainty, not analytical curve
    if number in {'F30', 'F31'}:
        return Rule('analytical_probability_percent_plot', 5e-6, 1e-5)
    return FIT_DERIVED


@dataclass
class Group:
    counts: Counter = field(default_factory=Counter)
    max_abs: float = 0.0
    max_rel: float = 0.0
    numeric_pairs: int = 0
    nonzero_reference_pairs: int = 0
    zero_reference_nonzero: int = 0
    policies: set = field(default_factory=set)


class Comparison:
    """Stream all nonidentical comparisons and group their magnitudes."""

    def __init__(self, report_dir: Path, strict: bool):
        self.strict = strict
        self.groups = defaultdict(Group)
        self.totals = Counter()
        self.report_dir = report_dir
        self.detail_stream = (report_dir / 'discrepancies.csv').open('w', encoding='utf-8', newline='')
        self.details = csv.writer(self.detail_stream)
        self.details.writerow(['file', 'metric', 'location', 'status', 'rule',
                               'reference', 'regenerated', 'delta', 'abs_difference',
                               'relative_difference', 'rtol', 'atol', 'allowed_difference', 'note'])

    def record(self, filename, metric, location, status, rule, a, b, note='',
               delta=None, relative=None, limit=None):
        group = self.groups[filename, metric]
        group.counts[status] += 1
        group.policies.add(f'{rule.name} (rtol={rule.rtol:g}, atol={rule.atol:g})')
        self.totals[status] += 1
        if delta is not None:
            group.numeric_pairs += 1
            group.max_abs = max(group.max_abs, abs(delta))
            if relative is not None:
                group.nonzero_reference_pairs += 1
                group.max_rel = max(group.max_rel, relative)
            elif delta != 0:
                group.zero_reference_nonzero += 1
        if status not in {'EXACT', 'VALIDATED'}:
            self.details.writerow([filename, metric, location, status, rule.name, a, b,
                                   delta, abs(delta) if delta is not None else '', relative,
                                   rule.rtol, rule.atol, limit, note])

    def check(self, filename, metric, location, condition, note, a='', b='', review=False):
        status = 'VALIDATED' if condition else ('REVIEW' if review else 'FAIL')
        self.record(filename, metric, location, status, EXACT, a, b, note)

    def value(self, filename, metric, location, a, b, rule=EXACT):
        if self.strict and rule.kind in {'numeric', 'diagnostic', 'review'}:
            rule = STRICT
        if is_number(a) and is_number(b):
            if not is_finite(a) or not is_finite(b):
                self.record(filename, metric, location, 'FAIL', rule, a, b, 'Nonfinite numerical value')
                return
            delta = float(b - a) if isinstance(a, Decimal) and isinstance(b, Decimal) else float(b) - float(a)
            relative = abs(delta / float(a)) if a != 0 else None
            limit = max(rule.atol, rule.rtol * max(abs(float(a)), abs(float(b))))
            if rule.kind == 'baseline_zero':
                # Check both operands independently, even when they are identical.
                # Decimal comparison avoids losing precision at the tolerance boundary.
                tolerance = Decimal(str(rule.atol))
                left, right = Decimal(str(a)), Decimal(str(b))
                near_zero = abs(left) <= tolerance and abs(right) <= tolerance
                close = abs(right - left) <= tolerance
                status = ('EXACT' if a == b else 'EQUIVALENT') if near_zero and close else 'FAIL'
                note = 'Both analytical baseline values and their difference must be within the absolute zero tolerance.'
                self.record(filename, metric, location, status, rule, a, b, note, delta, relative, limit)
                return
            if a == b:
                status = 'EXACT'
            elif rule.kind == 'diagnostic':
                status = 'DIAGNOSTIC'  # quality is checked independently below
            elif rule.kind == 'exact':
                status = 'FAIL'
            elif abs(delta) <= limit:
                status = 'EQUIVALENT'
            else:
                status = 'REVIEW' if rule.kind == 'review' else 'FAIL'
            note = 'Discrete-derived difference; inspect event/state counts and threshold margins.' if status == 'REVIEW' else ''
            self.record(filename, metric, location, status, rule, a, b, note, delta, relative, limit)
        else:
            if rule.kind == 'baseline_zero':
                self.record(filename, metric, location, 'FAIL', rule, a, b,
                            'Analytical baseline requires finite numerical values.')
                return
            # Preserve exact categorical and boolean types; no numeric coercion.
            same = type(a) is type(b) and a == b
            self.record(filename, metric, location, 'EXACT' if same else 'FAIL', EXACT, a, b)

    def tree(self, filename, a, b, keys=()):
        location = '$' + ''.join(f'[{k}]' if isinstance(k, int) else f'.{k}' for k in keys)
        base = Path(filename).name
        if base == 'figure_data.json' and keys:
            metric = '/'.join(str(k) for k in keys[:3])
        else:
            metric = '.'.join(str(k) for k in keys if not isinstance(k, int)) or 'structure'
        if base in {'simulation_config.json', 'seasonal_sensitivity_config.json', 'model_parameters.json'} and type(a) is not type(b) and json_rule(base, keys).kind == 'exact':
            self.check(filename, metric, location, False, 'Exact configuration type changed', type(a).__name__, type(b).__name__)
        if isinstance(a, dict) and isinstance(b, dict):
            self.value(filename, metric, location + '.keys', sorted(a), sorted(b))
            for k in sorted(a.keys() & b.keys()):
                self.tree(filename, a[k], b[k], keys + (k,))
        elif isinstance(a, list) and isinstance(b, list):
            self.value(filename, metric, location + '.length', len(a), len(b))
            for i, (x, y) in enumerate(zip(a, b)):
                self.tree(filename, x, y, keys + (i,))
        else:
            self.value(filename, metric, location, a, b, json_rule(Path(filename).name, keys))

    def fit_quality(self, filename, row, location):
        """Bound gradient per wet observation; retain objective/parameter checks."""
        def number(key):
            return float(row[key])
        try:
            n = number('n')
            shape_ok = (row['distribution'] == 'Exponential' and row['shape'] == '') or number('shape') > 0
            gradient = number('gradient_inf_norm')
            iterations = number('iterations')
            starts = number('successful_starts')
            norm = number('normalisation')
            valid = (row['converged'] == 'True' and n > 0 and n.is_integer()
                     and shape_ok and math.isfinite(number('scale_mm')) and number('scale_mm') > 0
                     and math.isfinite(norm) and 0 < norm <= 1
                     and math.isfinite(number('log_likelihood'))
                     and 1 <= starts <= 3 and starts.is_integer()
                     and 0 <= iterations <= 1000 and iterations.is_integer()
                     and math.isfinite(gradient) and 0 <= gradient / n <= 1e-6)
            self.check(filename, 'optimisation_quality', location, valid,
                       'Selected fit converged; valid parameters, starts/iterations; gradient/n <= 1e-6.',
                       'gradient/n <= 1e-6', gradient / n if n else 'undefined')
        except (ValueError, KeyError, ZeroDivisionError, OverflowError):
            self.check(filename, 'optimisation_quality', location, False, 'Malformed optimisation diagnostics')

    def count_check(self, filename, metric, location, a, b, denominator):
        """Recover integer event totals from exported rates, never round away changes."""
        if not denominator:
            return
        try:
            x, y = float(a) * denominator, float(b) * denominator
            if not math.isfinite(x) or not math.isfinite(y):
                raise ValueError('Nonfinite count')
            i, j = round(x), round(y)
            valid = abs(x - i) <= 1e-6 and abs(y - j) <= 1e-6
            self.check(filename, metric + '/count_grid', location, valid,
                       f'Rate must map to integer count; denominator={denominator}', x, y)
            if valid:
                delta = j - i
                self.record(filename, metric + '/event_or_state_count', location,
                            'EXACT' if i == j else 'REVIEW', EVENT_COUNT, i, j,
                            f'Count from exported rate; denominator={denominator}; inspect threshold crossings or state changes.',
                            delta, abs(delta/i) if i else None, 0)
        except (TypeError, ValueError, OverflowError):
            self.check(filename, metric + '/count_grid', location, False, 'Cannot reconstruct integer count', a, b)

    def csv(self, filename, reference, candidate, context):
        columns, rows = read_csv(reference)
        new_columns, new_rows = read_csv(candidate)
        self.value(filename, 'structure', 'columns', columns, new_columns)
        self.value(filename, 'structure', 'row_count', len(rows), len(new_rows))
        if columns != new_columns:
            return
        base = Path(filename).name
        for i, (row, actual_row) in enumerate(zip(rows, new_rows), 2):
            self.value(filename, 'structure', f'row {i}.width', len(columns), len(row))
            self.value(filename, 'structure', f'row {i}.candidate_width', len(columns), len(actual_row))
            r, s = dict(zip(columns, row)), dict(zip(columns, actual_row))
            identity = ', '.join(f'{k or "index"}={r[k]}' for k in columns if k in LABELS | EXACT_CONFIG | {'replications', 'batch'})
            loc = f'row {i} ({identity})'
            if base in FIT_FILES:
                self.fit_quality(filename, r, loc + '/reference')
                self.fit_quality(filename, s, loc + '/regenerated')
            for col, a, b in zip(columns, row, actual_row):
                rule = csv_rule(base, col, r)
                if col in LABELS:
                    av, bv = a, b
                else:
                    av, bv = numeric_cell(a), numeric_cell(b)
                metric = f'{r["metric"]}/{col}' if 'metric' in r else (f'{r[""]}/{col}' if '' in r else col)
                self.value(filename, metric, loc + '/' + col, av, bv, rule)
                count_spec = context.count_spec(base, col, r, s, av, bv) if context is not None else None
                if count_spec:
                    self.count_check(filename, metric, loc + '/' + col, *count_spec)

    def finish(self):
        self.detail_stream.close()
        statuses = ['EXACT', 'VALIDATED', 'EQUIVALENT', 'DIAGNOSTIC', 'REVIEW', 'FAIL']
        with (self.report_dir / 'summary.csv').open('w', encoding='utf-8', newline='') as stream:
            writer = csv.writer(stream)
            writer.writerow(['file', 'metric', *statuses, 'max_abs_difference', 'max_relative_difference',
                             'zero_reference_nonzero', 'numeric_pairs', 'criteria', 'outcome'])
            for (filename, metric), g in sorted(self.groups.items()):
                outcome = 'FAIL' if g.counts['FAIL'] else 'REVIEW' if g.counts['REVIEW'] else 'DIAGNOSTIC' if g.counts['DIAGNOSTIC'] else 'EQUIVALENT' if g.counts['EQUIVALENT'] else 'EXACT_OR_VALIDATED'
                writer.writerow([filename, metric, *(g.counts[s] for s in statuses),
                                 g.max_abs if g.numeric_pairs else '', g.max_rel if g.nonzero_reference_pairs else '',
                                 g.zero_reference_nonzero, g.numeric_pairs, '; '.join(sorted(g.policies)), outcome])
        (self.report_dir / 'result.json').write_text(json.dumps({'mode': 'strict' if self.strict else 'scientific', 'counts': dict(self.totals), 'accepted': not (self.totals['FAIL'] or self.totals['REVIEW'])}, indent=2) + '\n', encoding='utf-8')


class CountContext:
    """Use immutable reference configuration and calendar to recover count grids."""

    def __init__(self, reference: Path, candidate: Path):
        p, q = reference / 'data/processed', candidate / 'data/processed'
        self.config = json.loads((p / 'simulation_config.json').read_text())
        self.seasonal = json.loads((p / 'seasonal_sensitivity_config.json').read_text())
        _, rows = read_csv(p / 'evaluation_daily.csv')
        self.days = len(rows)
        self.season_days = Counter(row[6] for row in rows)
        self.years = len({row[4] for row in rows})
        self.wet_threshold = json.loads((p / 'model_parameters.json').read_text())['wet_threshold_mm']
        self.targets = []
        for root in (p, q):
            with (root / 'analytical_benchmarks.csv').open(newline='', encoding='utf-8-sig') as stream:
                self.targets.append({r['metric']: float(r['analytical']) for r in csv.DictReader(stream)})

    def count_spec(self, base, column, r, s, a, b):
        metric = r.get('metric', column)
        if not (is_event(metric) or metric in OCCURRENCE_METRICS):
            return None
        if not (is_finite(a) and is_finite(b)):
            return None
        den = None
        if base == 'holdout_trajectory_statistics.csv':
            den = self.days
        elif base == 'convergence_batches.csv' and column == 'error':
            den = int(r['replications']) * self.config['convergence_days']
            return float(a) + self.targets[0][metric], float(b) + self.targets[1][metric], den
        elif base == 'monte_carlo_analytical.csv' and column == 'mean':
            den = int(r['n']) * self.config['verification_days']
        elif base == 'annual_simulation_uncertainty.csv' and column == 'mean':
            den = int(r['n'])
        elif base in {'holdout_comparison.csv', 'seasonal_holdout.csv', 'comparative_holdout.csv',
                      'seasonal_analytical.csv', 'comparative_paired.csv'} and column == 'mean':
            n = int(r['n'])
            group = r.get('group', 'all')
            if metric.startswith('annual_probability'):
                den = n * (self.years if group == 'all' else 1)
            else:
                den = n * self.season_days.get(group, self.days)
        elif base == 'sensitivity_scenarios.csv' and column in {'mean', 'paired_delta'}:
            n = int(r['paired_n'] if column == 'paired_delta' else r['n'])
            den = n if metric.startswith(('annual_count', 'annual_event')) else n * self.seasonal['annual_days']
        return (a, b, den) if den else None

def png_resolution(path: Path) -> tuple[int, int, int]:
    """Check PNG signature, physical-resolution chunk and end marker without comparing pixels."""
    with path.open("rb") as stream:
        if stream.read(8) != b"\x89PNG\r\n\x1a\n":
            raise ValueError(f"Not a PNG: {path}")
        resolution = None
        while True:
            header = stream.read(8)
            if len(header) != 8:
                raise ValueError(f"Truncated PNG: {path}")
            size, kind = struct.unpack(">I4s", header)
            if kind == b"pHYs":
                resolution = struct.unpack(">IIB", stream.read(size))
            else:
                stream.seek(size, 1)
            if len(stream.read(4)) != 4:
                raise ValueError(f"Truncated PNG chunk: {path}")
            if kind == b"IEND":
                break
    if resolution is None:
        raise ValueError(f"Missing resolution metadata: {path}")
    return resolution


def inventory(root: Path, label: str, checks: Comparison) -> tuple[dict, set]:
    """Read declared paths and record all missing, duplicated or unsafe entries."""
    with (root / MANIFEST).open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if reader.fieldnames != ['path', 'cell', 'description']:
            raise ValueError(f'Invalid manifest header in {root}: {reader.fieldnames}')
        records = list(reader)
    paths = [record['path'] for record in records]
    checks.value(MANIFEST, 'inventory', label + '/record_count', EXPECTED_OUTPUTS, len(paths))
    checks.value(MANIFEST, 'inventory', label + '/unique_count', EXPECTED_OUTPUTS, len(set(paths)))
    checks.value(MANIFEST, 'inventory', label + '/figure_count', EXPECTED_FIGURES,
                 sum(isinstance(p, str) and p.endswith('.png') for p in paths))
    for required in (MANIFEST, FIGURE_DATA):
        checks.check(MANIFEST, 'inventory', label + '/' + required, required in paths, 'Required entry')
    usable = set()
    result = {}
    for i, record in enumerate(records, 2):
        name = record['path']
        if not name or None in record or any(value is None for value in record.values()):
            checks.check(MANIFEST, 'inventory', f'{label}/row {i}', False, 'Malformed manifest record', '', record)
            continue
        if name in result:
            checks.check(MANIFEST, 'inventory', label + '/' + name, False, 'Duplicate manifest path')
        result[name] = record
        path = (root / name).resolve()
        safe = not Path(name).is_absolute() and path.is_relative_to(root.resolve())
        exists = safe and path.is_file()
        checks.check(name, 'manifest_presence', label, exists, 'Safe manifest path and existing file', 'present', 'present' if exists else 'missing or unsafe')
        if exists:
            usable.add(name)
    return result, usable


def verify_raw(checks, candidate: Path, reference: Path, raw_dir: Path | None):
    directories = [('regenerated input', raw_dir or candidate / 'data/raw')]
    if (reference / 'data/raw').is_dir():
        directories.append(('reference input', reference / 'data/raw'))
    for label, directory in directories:
        for name, expected in RAW_HASHES.items():
            path = directory / name
            filename = 'data/raw/' + name
            if not path.is_file():
                checks.check(filename, 'SHA256', label, False,
                             'Raw input unavailable; supply --raw-dir and retain C02 evidence.', expected, 'missing', review=True)
                continue
            actual = hashlib.sha256(path.read_bytes()).hexdigest()
            checks.check(filename, 'SHA256', label, actual == expected, 'Original raw byte checksum', expected, actual)


def example_events(checks, expected, actual, context):
    """Inspect each exported example-day wet and strict exceedance classification."""
    q95 = context.config['primary_threshold_mm']
    q99 = context.config['secondary_threshold_mm']
    for name in ('F15_synthetic_trajectory', 'F24_seasonal_trajectory'):
        try:
            dates, x = expected[name][0]['lines'][0]
            dates_new, y = actual[name][0]['lines'][0]
            for day, a, b in zip(dates, x, y):
                day_label = (date(1970, 1, 1) + timedelta(days=int(day))).isoformat()
                checks.check(FIGURE_DATA, name + '/support', day_label,
                             all(math.isfinite(v) and (v == 0 or v >= context.wet_threshold) for v in (a, b)),
                             'Rainfall must be zero or at least the wet-day threshold', a, b)
                for label, fn in [('wet', lambda v: v >= context.wet_threshold), ('P95', lambda v: v > q95), ('P99', lambda v: v > q99)]:
                    e, f = fn(a), fn(b)
                    checks.record(FIGURE_DATA, name + '/' + label, f'calendar day {day_label} (plot coordinate {day})',
                                  'EXACT' if e == f else 'REVIEW', EVENT_COUNT, e, f,
                                  f'Example trajectory classification; amounts {a} -> {b} mm')
        except (KeyError, IndexError, ValueError, TypeError) as exc:
            checks.check(FIGURE_DATA, name, 'example trajectory', False, str(exc))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference', type=Path, help='Frozen completed S006 output root')
    parser.add_argument('regenerated', type=Path, help='New completed output root')
    parser.add_argument('--strict', action='store_true', help='Original numerical tolerance for continuous/diagnostic fields; exact structural checks remain')
    parser.add_argument('--raw-dir', type=Path, help='Original raw snapshots used for candidate run, if outside candidate/data/raw')
    parser.add_argument('--report-dir', type=Path, help='New or empty report directory outside both input roots (default: temporary folder)')
    args = parser.parse_args()
    reference, candidate = args.reference.resolve(), args.regenerated.resolve()
    if reference == candidate:
        parser.error('Use separate reference and regenerated roots.')
    report = args.report_dir.resolve() if args.report_dir else Path(tempfile.mkdtemp(prefix='colombo-regression-')).resolve()
    if report.is_relative_to(reference) or report.is_relative_to(candidate):
        parser.error('Report directory must be outside both input roots.')
    if report.exists() and (not report.is_dir() or any(report.iterdir())):
        parser.error('Choose a new or empty report directory.')
    report.mkdir(parents=True, exist_ok=True)
    checks = Comparison(report, args.strict)
    execution_error = False
    try:
        verify_raw(checks, candidate, reference, args.raw_dir)
        ref, ref_usable = inventory(reference, 'reference', checks)
        new, new_usable = inventory(candidate, 'regenerated', checks)
        checks.value(MANIFEST, 'inventory', 'path set', sorted(ref), sorted(new))
        for name in sorted(ref.keys() & new.keys()):
            checks.value(MANIFEST, 'record', name, ref[name], new[name])
        # Compare actual manifest-managed file inventory, excluding input raw files.
        # No extra scientific CSV/JSON/PNG is allowed in managed output directories.
        for root, label, records in [(reference, 'reference', ref), (candidate, 'regenerated', new)]:
            for subdir, suffixes in [('data/processed', {'.csv', '.json'}), ('figures', {'.png'})]:
                observed = sorted(p.relative_to(root).as_posix() for p in ((root/subdir).iterdir() if (root/subdir).is_dir() else []) if p.is_file() and p.suffix.lower() in suffixes)
                declared = sorted(p for p in records if str(Path(p).parent).replace('\\', '/') == subdir and Path(p).suffix.lower() in suffixes)
                checks.value(MANIFEST, 'managed_inventory', label + '/' + subdir, declared, observed)
        try:
            context = CountContext(reference, candidate)
        except (OSError, ValueError, KeyError, TypeError) as exc:
            context = None
            execution_error = True
            checks.check(MANIFEST, 'count_context', 'initialisation', False, str(exc))
        for name in sorted(ref_usable & new_usable):
            a, b = reference/name, candidate/name
            try:
                if name in METADATA:
                    checks.record(name, 'runtime_metadata', 'presence', 'DIAGNOSTIC', RUNTIME_METADATA, 'present', 'present', 'Platform/timing metadata intentionally not compared')
                elif name == MANIFEST:
                    continue  # exact path and record comparison above; row ordering is not scientific
                elif name.endswith('.png'):
                    for path, label in [(a, 'reference'), (b, 'regenerated')]:
                        x, y, unit = png_resolution(path)
                        checks.check(name, 'PNG_resolution', label, unit == 1 and abs(x*.0254-300) <= .1 and abs(y*.0254-300) <= .1, 'PNG signature/end marker and 300 DPI; pixels not compared', 300, (x*.0254,y*.0254,unit))
                elif name.endswith('.csv'):
                    checks.csv(name, a, b, context)
                elif name.endswith('.json'):
                    expected = json.loads(a.read_text(encoding='utf-8'))
                    actual = json.loads(b.read_text(encoding='utf-8'))
                    if name == FIGURE_DATA:
                        keys = sorted(Path(p).stem for p in ref if p.endswith('.png'))
                        checks.value(name, 'figure_inventory', 'reference', keys, sorted(expected))
                        checks.value(name, 'figure_inventory', 'regenerated', keys, sorted(actual))
                        if context is not None:
                            example_events(checks, expected, actual, context)
                    checks.tree(name, expected, actual)
                else:
                    checks.value(name, 'text', 'lines', a.read_text(encoding='utf-8').splitlines(), b.read_text(encoding='utf-8').splitlines())
            except (OSError, ValueError, KeyError, TypeError, struct.error, OverflowError) as exc:
                execution_error = True
                checks.check(name, 'read_error', 'file', False, str(exc))
    except (OSError, ValueError, KeyError, TypeError, struct.error, OverflowError) as exc:
        execution_error = True
        checks.check(MANIFEST, 'inventory_or_context_error', 'initialisation', False, str(exc))
    finally:
        checks.finish()
    print('Mode:', 'strict diagnostic' if args.strict else 'scientific numerical equivalence')
    for status in ['EXACT', 'VALIDATED', 'EQUIVALENT', 'DIAGNOSTIC', 'REVIEW', 'FAIL']:
        print(f'{status}: {checks.totals[status]:,}')
    print(f'Full report: {report}')
    if execution_error:
        print('ERROR: incomplete comparison; inspect reports.')
        return 2
    if checks.totals['FAIL'] or checks.totals['REVIEW']:
        print('NOT ACCEPTED: substantive differences or discrete changes require investigation.')
        return 1
    print('PASS: manifest, scientific values, figure data and PNG resolution agree under the selected policy.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
