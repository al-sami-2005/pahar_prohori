# M8 — Submission-ready polish

M8 deliberately adds no new scientific claim or major product feature. It hardens the existing M1–M7 experience for judging and public demonstration.

## Visual / UX

- Reworked the product into a bright **Atlas** cartographic theme: soft neutral land, light blue water, white floating surfaces and high-contrast charcoal text.
- Kept semantic data colours distinct: blue = Space/NISAR, violet = AI risk, green = Ground, amber/orange/red = escalating human-action states.
- Increased default UI type size and contrast for judge readability.
- Simplified shadows and panel elevation to feel closer to familiar map software than a dark analytics dashboard.
- Updated map labels, markers, focus treatment, Replay and Deployment surfaces, warning UI, logo and favicon.
- Preserved all existing responsive structures and touch-first mobile layouts.

## Reliability

- Added a production error boundary so a render failure produces a recoverable interface instead of a blank screen.
- Added route-aware browser titles.
- Added `npm run check` for the final unit-test → lint → production-build gate.
- Preserved the deterministic scenario, Replay hindsight lock and Deployment ranking architecture without changing thresholds or scientific logic.

## Submission / metadata

- Added app manifest and updated page metadata/theme colour.
- Added a concise 90-second judge-demo script.
- Updated README guidance for real vs simulated/illustrative data and final verification.

## Locked scientific rules

- Relative Risk is a ranking, not a probability.
- EVACUATE still requires independent current-condition evidence.
- NISAR acquisition date is not treated as guaranteed processed-product availability in Replay.
- Post-event evidence never appears as pre-event intelligence.
- Deployment remains a prototype priority ranking, not an optimisation claim.
