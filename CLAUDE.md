# Pahar Prohori — Claude Code Project Memory

Read the detailed project source context in:
@PAHAR_PROHORI_CONTEXT.md

## Project Identity
**Name:** Pahar Prohori (পাহাড় প্রহরী)  
**English:** The Hill Guardian  
**Competition:** NASA Space Apps Challenge 2026 — “Dancing with the SARs (NISAR)”  
**Product concept:** A space-to-ground landslide early-warning and risk-intelligence prototype for Chattogram and the Ukhiya–Teknaf hill regions of Bangladesh.

## Core Product Thesis
The entire product must communicate one mental model:

**SPACE → AI → GROUND → HUMAN ACTION**

- **Space / WHERE:** NASA–ISRO NISAR radar helps identify surface change, landslide scars, and potentially unstable/creeping slopes.
- **AI / HOW LIKELY:** A risk-ranking model combines NISAR-derived signals with rainfall, terrain, and historical landslide information.
- **Ground / WHEN CONDITIONS ESCALATE:** Low-cost ESP32 sensor nodes monitor local soil moisture, rainfall, and tilt/movement.
- **Human Action:** The system escalates from Watch → Warning → Evacuate and presents a clear local warning in English/Bengali.

The product is NOT a generic weather dashboard, admin panel, SaaS analytics page, or sci-fi visualization. It is an **Earth-observation emergency intelligence command center**.

## Source-of-Truth Scientific Architecture
### Layer 1 — Space
Use:
- NISAR L-band SAR
- GCOV terrain-corrected radar brightness imagery
- GUNW / InSAR interferograms where available

Intended UI output:
- before/after change layer
- landslide scar evidence
- slow ground-change / movement evidence where supported
- source metadata and acquisition date

### Layer 2 — AI Risk Ranking
Concept:
- XGBoost-style landslide risk model
- NASA Global Landslide Catalog as historical labels
- NASA GPM IMERG rainfall
- NASADEM terrain/slope
- NISAR change evidence
- NASA LHASA as a baseline comparison

IMPORTANT:
- UI should say **Relative Risk Index** unless the team has a genuinely calibrated failure probability.
- Never invent model accuracy, hit-rate, false-alarm rate, probability, or superiority over LHASA.
- If validation is unfinished, label it **Prototype Backtest** or **Validation Pending**.

### Layer 3 — Ground Sensing
Prototype hardware:
- ESP32
- LoRa
- soil moisture at two depths
- tilt / accelerometer (e.g. MPU6050)
- rain gauge
- Raspberry Pi gateway
- siren / buzzer / LED

Ground-sensor UI may be simulated for the web demo, but simulation must be visibly labeled.

## Alert Logic
Three conceptual levels:
1. **WATCH** — heavy/accumulated rainfall in a high-risk area; officials/volunteers should pay attention.
2. **WARNING** — soil is near saturation AND rain is continuing; residents prepare / shelters may open.
3. **EVACUATE** — saturation AND rising tilt/movement; two independent signals agree.

Critical principle:
**Two independent signals are required before the prototype escalates to EVACUATE.**

Do not imply exact collapse prediction. Prefer:
“conditions associated with escalating landslide danger”
instead of:
“the hill will collapse at X time”.

If demo thresholds are invented for animation, mark them:
**ILLUSTRATIVE DEMO THRESHOLD — NOT OPERATIONAL**

## Primary Demo Story
The judging demo must be understandable in ~2 minutes:

1. Mission Control opens on a dark terrain map of Chattogram / Ukhiya.
2. Toggle **NISAR Change** to show space-derived evidence.
3. Toggle **AI Risk** to show relative slope ranking.
4. Select a slope to open **Slope Intelligence**.
5. Run a deterministic **Monsoon Scenario**.
6. Rain increases → soil moisture rises → WATCH becomes WARNING.
7. Tilt/movement appears → second independent signal → EVACUATE.
8. Open **Why this status?** to reveal the evidence chain.
9. Show the bilingual warning.
10. Optionally show July 2026 Replay and Sensor Deployment Planner.

## Required Product Experiences
Build these in this priority order:

### P0 — Mission Control
Nearly full-screen geospatial command center.
Must include:
- top navigation
- operational telemetry strip
- large map
- compact layer switcher
- sensor nodes
- risk polygons
- alert state
- selected-slope drawer/panel
- “Run Monsoon Scenario” CTA
- “Demo Mode — Simulated Sensor Telemetry” indicator

### P0 — Slope Intelligence
Right-side panel for a selected slope:
- slope ID / name
- alert state
- Relative Risk Index
- confidence / uncertainty
- updated timestamp
- rainfall
- topsoil moisture
- deep-soil moisture
- tilt/movement
- NISAR change evidence
- sensor connectivity / battery / LoRa
- “Why this status?” control

### P0 — Evidence Chain
A premium, readable chain:
1. SPACE — NISAR
2. ENVIRONMENT — GPM rainfall
3. TERRAIN — slope + historical susceptibility
4. GROUND — soil moisture
5. MOVEMENT — tilt
6. DECISION — alert rule

Every step should show provenance/freshness.

### P0 — Monsoon Scenario Simulator
Deterministic seeded demo with no randomness during judging:
- initial WATCH
- rainfall rises
- soil saturation rises
- WARNING
- movement signal starts
- EVACUATE
- map/panel/charts/notification all synchronize
- explicit restart button
- no autoplay audio

### P1 — July 2026 Event Replay
Timeline scrubber for a prototype backtest:
- rainfall accumulation
- risk map evolution
- historical/reported landslide markers if available
- NISAR evidence layer if available
- Pahar Prohori vs NASA LHASA area
- do not fabricate validation metrics

### P1 — Guardian Deployment Planner
Question:
“If we only have N sensors, which slopes should be instrumented first?”

Budget selector:
- 5
- 10
- 25
- 50 nodes

Highlight highest-priority candidate slopes from the supplied risk ranking.
Do not invent population/exposure data unless provided.

### P2 — Method / Data Provenance
Explain:
- NISAR GCOV / GUNW
- GPM IMERG
- NASADEM
- Global Landslide Catalog
- LHASA
- sensor telemetry
- derived vs simulated data
- timestamps / freshness

## Visual Direction
Desired feel:
**bright premium cartographic intelligence + calm emergency operations + familiar map-product usability**

Avoid “AI slop”.
Avoid stock admin-dashboard layouts.
Avoid purple gradients.
Avoid excessive glassmorphism.
Avoid giant glowing cards.
Avoid decorative particles.
Avoid 3D spinning globes.
Avoid fake live-data claims.
Avoid too many equal-weight cards.

The map is the hero.

### Final M8 Color Tokens — LOCKED
- --bg: #F5F7FA
- --surface: #FFFFFF
- --surface-elevated: #EEF3F7
- --text: #1F2933
- --text-muted: #586A79
- --satellite: #1677C8
- --ai: #6857C9
- --healthy: #08775A
- --accent: #0F7D72
- --watch: #9B6905
- --warning: #B84D12
- --evacuate: #C8374D

M8 uses a light, map-first Atlas visual system. Do not revert to the old dark dashboard palette unless the user explicitly requests a redesign.

**Red is reserved for dangerous/evacuation states.**

### Typography
Prefer:
- English UI: Geist / Manrope / IBM Plex Sans (choose one cohesive system)
- telemetry / IDs / coordinates: JetBrains Mono or IBM Plex Mono
- Bengali: Noto Sans Bengali

### Motion
- panels ~180–240ms
- map fly-to ~600–800ms
- chart reveal ~400–600ms
- sensor pulse ~2.5–3s
- respect prefers-reduced-motion

Normal state should feel calm.
Warning should feel increasingly urgent.
Evacuate should command attention without turning into visual chaos.

## UX Rules
- Critical alert status cannot depend on color alone.
- Always include text + icon + state name.
- Keep the first screen presentation-ready at 1440×900 without scrolling.
- Responsive across desktop, laptop, tablet and phone; preserve the map-first hierarchy on every layout.
- Keyboard-visible focus states.
- Plain-language labels.
- Bengali warning layout must be tested for wrapping.
- Keep technical provenance available but not overwhelming.

## Data Provenance Labels
Use explicit labels:
- NASA DATA
- DERIVED
- SIMULATED
- LAB TEST
- STALE
- VALIDATION PENDING

Never make fake/simulated data appear measured.

## Suggested Tech Stack
Use:
- React
- TypeScript
- Vite
- Tailwind CSS
- Motion / Framer Motion
- MapLibre GL JS
- Recharts
- Lucide React
- local JSON / GeoJSON first

Avoid backend/auth/database unless required for the demo.

## Suggested Project Structure
```text
src/
  app/
    App.tsx
    routes.tsx
  components/
    command/
    map/
    slope/
    telemetry/
    evidence/
    alerts/
    replay/
    deployment/
    ui/
  data/
    slopes.ts
    sensors.ts
    telemetry.ts
    replay.ts
    mapLayers.ts
  hooks/
    useScenario.ts
    useSelectedSlope.ts
  lib/
    alertEngine.ts
    formatters.ts
    provenance.ts
  pages/
    MissionControl.tsx
    EventReplay.tsx
    DeploymentPlanner.tsx
    Method.tsx
  styles/
    globals.css
    tokens.css
```

## Engineering Rules
- Use strict TypeScript.
- Prefer reusable primitives and small components.
- No `any` unless unavoidable and documented.
- No inline giant data blobs in page components.
- Keep demo data deterministic.
- Keep alert computation in `lib/alertEngine.ts`.
- Keep scenario timeline in a dedicated hook/state machine.
- Do not create unnecessary files.
- Run typecheck/build after meaningful milestones.
- Fix errors rather than hiding them.
- Keep the dev server runnable at every checkpoint.
- Do not rewrite working architecture merely for style.

## Mock Data Rules
Mock objects must include provenance.

Example:
```ts
type DataProvenance = {
  kind: "nasa" | "derived" | "simulated" | "lab";
  source: string;
  product?: string;
  acquiredAt?: string;
  updatedAt?: string;
  stale?: boolean;
};
```

Slope values should support:
```ts
type Slope = {
  id: string;
  name: string;
  relativeRiskIndex: number;
  riskBand: "low" | "moderate" | "high" | "critical";
  confidence: "low" | "medium" | "high";
  slopeDegrees?: number;
  rainfall24h?: number;
  soilMoistureTop?: number;
  soilMoistureDeep?: number;
  tiltDelta?: number;
  alertLevel: "watch" | "warning" | "evacuate";
  lastUpdated: string;
};
```

Do not present fabricated fields as real observations.

## Content / Scientific Integrity
Never fabricate:
- NASA observations
- sensor measurements
- validated thresholds
- AI accuracy
- probability of failure
- time-to-collapse
- people protected
- backtest success
- official deployment status

When data is not provided, prefer explicit placeholders or simulation labels.

## Current Submission Goal
The immediate goal is a highly polished, reliable, judge-ready web prototype that:
1. communicates the concept in seconds,
2. demonstrates the SPACE → AI → GROUND → HUMAN chain,
3. looks premium,
4. keeps scientific claims honest,
5. has a deterministic interactive scenario that cannot fail during the demo.

When tradeoffs are required, prioritize in this order:
**demo reliability → visual hierarchy → scientific clarity → interaction polish → extra features.**

## Claude Operating Instruction
When working in this repo:
1. Read this file first.
2. Inspect existing code before changing architecture.
3. Implement one milestone at a time.
4. Prefer complete working vertical slices over many unfinished screens.
5. Preserve the product thesis and scientific integrity rules.
6. After each milestone, run the relevant build/typecheck and fix errors.
7. Do not stop at a generic first visual pass; refine spacing, typography, hierarchy, empty states, hover/focus states, loading states, and motion.
