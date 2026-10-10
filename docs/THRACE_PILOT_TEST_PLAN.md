# Thrace pilot test plan

## Scope and honesty

This plan validates repeatability of data retrieval and the saved-area product flow. It does not prove the system can predict fires. A discovered satellite scene is not a calculated NDVI/NDMI value; FIRMS thermal anomalies are not confirmed incident records.

## Fixed pilot anchors

Use the version-controlled defaults in \`scripts/build_thrace_fire_dataset.py\` for repeatable software checks:
- Edirne: 41.6771, 26.5557
- Kırklareli: 41.7351, 27.2252
- Tekirdağ: 40.9780, 27.5110

These are reproducibility anchors near provincial centres, not confirmed forest sample plots. For research conclusions, justify site selection against land cover and forest boundaries before making claims about forests.

## Repeatable data run

1. Choose and record one date range and one FIRMS sensor/product.
2. Preserve original FIRMS CSV exports and record export source, download date, filenames, and licence.
3. Run \`scripts/build_thrace_fire_dataset.py\` with the same input files, dates, and radius.
4. Confirm output metadata records weather endpoint, returned timezone, units, site coordinates, date range, counts, and provider errors.
5. Check no missing temperature/humidity/wind/precipitation values were converted to zero.
6. Check NDVI/NDMI remain blank until actual calculations are performed.
7. Repeat the run and compare row keys/counts; investigate provider revisions rather than silently accepting unexplained changes.

## Baseline and evaluation

Freeze a chronological train/test cutoff before examining metrics. Report per-site and per-year counts and class balance. Compare a prespecified simple baseline and any candidate model on the same later dates. Report confusion matrix, precision, recall, specificity, balanced accuracy, and uncertainty. If positive labels are too few, report that metrics are not estimable instead of overstating performance.

## Real area-management checks

Run each step on desktop and a real mobile browser/PWA and preserve evidence:
- Create/draw an area, save, reload, and confirm it persists.
- Reopen it after navigating away.
- Delete it, reload, and confirm it remains deleted.
- Repeat with offline mode and after reconnection.
- Record device/browser/OS, date, result, screenshots, and console/network errors.

Do not mark the test plan as passed based only on source inspection or static smoke checks. No live browser run is implied by this document.
