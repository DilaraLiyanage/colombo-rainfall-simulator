# Data provenance and licensing

No raw data is distributed in this repository. Candidate Open-Meteo historical exports have metadata coordinates 6.924429 N, 79.90725 E, elevation 4 m, timezone Asia/Colombo (UTC+05:30). The daily export contains precipitation_sum (mm) and precipitation_hours (h); the hourly export contains precipitation (mm). Both begin on 2001-01-01. These are candidate inputs, not an approved dataset.

Provider: [Open-Meteo historical weather API](https://open-meteo.com/en/docs/historical-weather-api). Underlying reanalysis model, retrieval date, full query, date coverage, aggregation convention and applicable licence/attribution terms must be confirmed before redistribution. Consult [provider terms](https://open-meteo.com/en/terms) and the selected upstream dataset terms. The MIT code licence does not grant rights to third-party data.

Before calibration, document the selected product/version, source URL, access date, units, missingness, duplicate timestamps, day boundaries, transformations and checksum. Keep raw files local until rights are confirmed. Academic literature is listed separately in ../REFERENCES.md.
