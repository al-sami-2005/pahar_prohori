# M8 Simple UX pass

This pass intentionally reduces chrome instead of adding features.

## Design goal
A first-time user should be able to do three things without learning the product:

1. Find a place or slope.
2. Understand what the map is showing.
3. Run the Monsoon Scenario and understand why the alert changes.

## Changes

- The header now exposes only Mission, Guided demo, language, and one Menu.
- Replay, Deployment, Method, status, time, and demo information live in the Menu.
- The operational ribbon shows only sensor availability, active alerts, and scenario state.
- Map tools are reduced to Search, Layers, and Menu. Sensors, Risk ranking, NISAR passes, and Focus live under Menu.
- The map legend is collapsed by default.
- The first-use help card is shorter and action-oriented.
- Site switching uses one familiar dropdown instead of segmented controls.
- Slope Intelligence shows the three live signals first; NASA metadata, sensor health, and thresholds are under More details.
- Replay keeps the current-date summary visible and puts the technical evidence ledger behind Show replay details.
- Validation is progressively disclosed instead of always occupying the replay panel.
- Deployment keeps budget, summary, and priority list visible; marker legend and ranking methodology are under How the priority is set.
- Method is a plain-language page first, with technical data/provenance sections as accordions.
- Relative-risk fills were softened so the basemap reads more like a familiar consumer map while maintaining the AI layer's semantics.

## Scientific logic
No alert thresholds, scenario timing, hindsight rules, replay availability rules, deployment ranking rules, or provenance semantics were changed in this UX pass.
