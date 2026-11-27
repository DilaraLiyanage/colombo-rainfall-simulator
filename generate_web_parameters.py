"""Export frozen notebook parameters and analytical verification targets for the browser.
Run from any working directory: python generate_web_parameters.py
No scientific dependencies, refitting, or network access required.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path


def generate(root: Path, destination: Path) -> None:
    processed = root / 'data' / 'processed'
    source = processed / 'model_parameters.json'
    # Hash the original JSON bytes, not the parsed/pretty-printed representation.
    raw = source.read_bytes()
    model = json.loads(raw)
    if model['schema_version'] != 2 or model['state_order'] != ['dry', 'wet']:
        raise ValueError('Unsupported model schema/state order')
    if model['transition_season'] != 'destination_date' or model['initial_state_semantics'] != 'day_before_first_date':
        raise ValueError('Unsupported calendar or initial-state convention')
    # The Python analytical CSV values are independent benchmark targets, not calibration inputs.
    targets = {}
    for kind, filename in [('homogeneous', 'analytical_benchmarks.csv'), ('seasonal', 'seasonal_analytical.csv')]:
        with (processed / filename).open(encoding='utf-8', newline='') as handle:
            targets[kind] = {row['metric']: float(row['analytical']) for row in csv.DictReader(handle)}
    # Frozen analytical scenario outputs serve as shared-input fixtures, not model inputs.
    scenarios = {}
    with (processed / 'sensitivity_scenarios.csv').open(encoding='utf-8', newline='') as handle:
        for row in csv.DictReader(handle):
            key = tuple(float(row[k]) for k in ('k01', 'k11', 'kbeta'))
            fixture = scenarios.setdefault(key, {
                'k01': key[0], 'k11': key[1], 'kb': key[2],
                'p01': float(row['p01']), 'p11': float(row['p11']),
                'beta_mm': float(row['beta_mm']), 'targets': {}})
            if row['metric'] in (
                'stationary_wet_probability',
                'expected_daily_mm',
                'mean_wet_mm',
                'mean_wet_spell_days',
                'daily_P95_exceedance',
                'daily_P99_exceedance'
            ):
                fixture['targets'][row['metric']] = float(row['analytical'])
    # Preserve the schema and source provenance for both direct-file and hosted execution.
    payload = {'model': model, 'python_benchmarks': targets,
               'sensitivity_fixtures': list(scenarios.values()),
               'source_sha256': hashlib.sha256(raw).hexdigest(),
               'source_git_blob': hashlib.sha1(f'blob {len(raw)}\0'.encode() + raw).hexdigest()}
    destination.parent.mkdir(parents=True, exist_ok=True)
    # A classic JavaScript asset avoids file:// JSON fetch restrictions.
    destination.write_text(
        '// Generated from notebook outputs. Do not edit manually.\nwindow.RAINFALL_EXPORT = ' + json.dumps(payload, indent=2, allow_nan=False) + ';\n',
        encoding='utf-8',
        newline='\n'
    )
    print(f'Generated {destination} from {source} ({payload["source_git_blob"]})')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    generate(args.root, args.output or args.root / 'docs' / 'model-parameters.js')
