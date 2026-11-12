# Pahar Prohori · পাহাড় প্রহরী

**The Hill Guardian** — a space-to-ground landslide intelligence and early-warning prototype for Chattogram and the Ukhiya–Teknaf hills.

NASA Space Apps Challenge 2026 — *Dancing with the SARs (NISAR)*.

> **SPACE → AI → GROUND → HUMAN ACTION**
>
> Satellites know **where**. AI ranks **how likely**. Ground sensors reveal **when conditions are escalating**.

## What the prototype demonstrates

- **Mission Control:** map-first slope monitoring with Relative Risk, NISAR context and simulated sensor telemetry.
- **Evidence Chain:** explains why the current alert is Normal, Watch, Warning or Evacuate.
- **Monsoon Scenario:** deterministic, time-compressed 46-second simulation of rainfall → saturation → movement → local warning.
- **July 2026 Replay:** hindsight-locked backtest interface that separates acquisition, processing availability and post-event evidence.
- **Guardian Deployment Planner:** deterministic prototype priority ranking for limited sensor budgets.
- **Method & Data Provenance:** clear separation of NASA data, derived indicators, simulation, illustration and validation-pending outputs.

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm ci
npm run dev        # http://localhost:5173
npm run test       # deterministic unit/regression tests
npm run lint       # oxlint
npm run build      # typecheck + production build → dist/
npm run check      # test → lint → build
npm run preview    # serve dist/ (normally http://localhost:4173)
```

Browser QA (optional; requires local Chrome/Chromium and a running `npm run preview`):

```bash
CHROME_PATH="/path/to/chrome" npm run qa:browser -- http://localhost:4173/ [screenshotDir]
```

The browser QA checks the 46-second scenario under normal and throttled rendering, Guided Demo gating, Restart and CTA targeting; Replay hindsight locking/autoplay/date persistence; and Deployment budgets plus map ⇄ list synchronization.

Design-system reference (development QA): `#/system`

## 90-second judge flow

See [`docs/JUDGE_DEMO.md`](docs/JUDGE_DEMO.md). The safest live-demo route is:

1. Mission Control → select **Batali Hill · Sector 03**.
2. Open **Why this status?** to show the Evidence Chain.
3. Run the deterministic Monsoon Scenario through **EVACUATE**.
4. Show the bilingual resident warning and two-independent-signal decision basis.
5. Open **Replay** to demonstrate the temporal hindsight lock.
6. Open **Deployment** and change the sensor budget from 5 → 10.

## Scientific-integrity rules

These are product rules, not optional copy conventions:

- **Relative Risk Index is a ranking, never a probability of landslide failure.**
- **EVACUATE requires independent current-condition evidence**; high AI risk alone cannot trigger it.
- Slope/sensor/rainfall telemetry in the interactive scenario is **simulated** and thresholds are **illustrative, not operational**.
- NISAR catalog/pass metadata is separated from **illustrative change footprints**.
- Replay distinguishes **acquisition time from processed-product availability** and keeps post-event evidence out of pre-event intelligence.
- Deployment is a **prototype priority ranking**, not an optimisation or lives-saved claim.
- Validation metrics remain **VALIDATION PENDING / NOT YET MEASURED** until the actual backtest is completed.

## Map and data

- **Offline base (always available):** `public/data/basemap.json`, built from geoBoundaries gbOpen BGD ADM3 (CC BY 4.0) and Natural Earth 10m (public domain). It provides real coastline, rivers and administrative geography.
- **Online enhancement (optional):** OpenFreeMap vector tiles (© OpenMapTiles © OpenStreetMap contributors) and Mapzen/AWS terrarium terrain. They are added after the bundled map loads; network failure never blocks core demo layers.
- **Demo layers (SIMULATED / ILLUSTRATIVE):** seeded slope units, Relative Risk placeholders, NISAR-change footprints and ground-node telemetry. Replace these with DEM-derived units, model output, processed GCOV/GUNW evidence and measured sensors for field work.
- **Real metadata:** NISAR pass metadata in `src/data/nisar.ts` comes from the team's NASA CMR catalog query (24 Sep 2026).

## Production reliability

- The map stays mounted across routes.
- Scenario and Replay use centralized deterministic clocks/state.
- A production error boundary prevents a rendering exception from becoming a blank judging screen.
- Critical controls are keyboard accessible, alert states are not colour-only, and reduced-motion preferences are respected.
- Core geography and demo data remain local so the project can run without network access.

## Project context

See `CLAUDE.md`, `PAHAR_PROHORI_CONTEXT.md`, and `docs/` for the design, science and implementation notes used during the hackathon build.

## M8 Simple UX

The final UX pass follows progressive disclosure: the map, Search, Layers, current alerts and the Monsoon Scenario stay immediately visible; technical NASA metadata, sensor diagnostics and methodology remain one click away. See `docs/M8_SIMPLE_UX.md`.

## M8.1 humanized UX

The final UX pass intentionally uses familiar mapping conventions: one app header, progressive disclosure, mobile bottom sheets, a compact location selector, direct search, and minimal persistent map controls. Technical detail remains available but is no longer required to understand the first screen. See `docs/M8_1_HUMANIZED_UX.md`.
