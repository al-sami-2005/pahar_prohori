# Pahar Prohori — Project Context

## One-line idea
**Satellites know WHERE. AI knows HOW LIKELY. The sensor knows WHEN conditions are escalating.**

Pahar Prohori (পাহাড় প্রহরী), “The Hill Guardian,” is a prototype landslide early-warning system for Chattogram and the Rohingya-camp hill regions. It combines NASA/spaceborne Earth-observation data, an AI risk-ranking layer, and low-cost local sensors.

## Problem
Monsoon-triggered landslides repeatedly threaten people living on or near steep hills in Chattogram, Cox's Bazar and the Ukhiya–Teknaf camp region.

The concept identifies three gaps in current warning:
- warnings are often area-wide rather than slope-specific,
- response can be reactive,
- slopes are not continuously instrumented everywhere.

Satellite monitoring provides large-area coverage but is not continuous enough to be the sole real-time warning mechanism. Ground sensors are fast but cannot be installed on every hill.

## Proposed Fusion
### 1. Space — WHERE?
NISAR L-band SAR provides wide-area surface-change information.
Planned products:
- GCOV before/after imagery
- GUNW / InSAR products when practical

Output:
- change/scar layer
- candidate unstable/creeping slopes
- evidence for prioritizing areas

### 2. AI — HOW LIKELY?
Risk ranking concept combines:
- NISAR change evidence
- NASA GPM IMERG rainfall
- terrain/slope from NASADEM
- historical landslide records
- NASA Global Landslide Catalog
- NASA LHASA as a comparison baseline

Output:
- relative risk score per slope
- sensor-placement prioritization

Use **Relative Risk Index**, not an uncalibrated “probability.”

### 3. Ground — WHEN CONDITIONS ESCALATE?
Prototype node:
- ESP32
- 2 soil-moisture sensors
- tilt/accelerometer
- rain gauge
- LoRa
- Raspberry Pi gateway
- siren/buzzer/LED

Output:
- near-real-time local condition monitoring
- escalating alerts

## Three Alert Levels
### WATCH
Heavy or accumulated rain affects a high-risk area.
Action: officials/volunteers pay attention.

### WARNING
Soil is near saturation AND rain continues.
Action: prepare residents / shelters.

### EVACUATE
Saturation AND rising tilt/movement are both present.
Action: urgent local warning, siren, English/Bengali alert.

**Two independent signals are required before EVACUATE.**

## Validation Concept
The team plans to replay/backtest the July 2026 event using only data available before the event and compare risk areas with actual/reported landslides.

Metrics envisioned:
- hit rate
- false-alarm area
- comparison with NASA LHASA

Do not invent these results before testing.

A physical soil-tray demo can be used to observe warning-to-collapse lead time under controlled laboratory conditions. This does not prove field performance.

## Hackathon Must-Haves
- NISAR before/after scar/change map
- risk map using model + rainfall
- one working/simulated sensor node
- dashboard with map
- live/simulated sensor telemetry
- alert level

Nice-to-have:
- InSAR movement layer
- Bengali voice/SMS preview
- multiple LoRa nodes

## UI Product Vision
The web prototype should look like a premium **Landslide Intelligence & Early Warning Command Center**.

It should NOT look like a generic admin dashboard.

Core interface:
- full-screen geospatial map
- compact mission telemetry strip
- slope risk polygons
- sensor markers
- selected-slope intelligence drawer
- data provenance
- alert-evidence explanation
- deterministic monsoon simulation
- July 2026 replay
- sensor deployment planner
- bilingual alert preview

## Hero Demo
1. Open Mission Control.
2. Show NISAR Change.
3. Show AI Relative Risk.
4. Select a high-risk slope.
5. Start Monsoon Scenario.
6. Increase rainfall and saturation → WARNING.
7. Introduce movement → EVACUATE.
8. Open “Why this status?”.
9. Show SPACE → ENVIRONMENT → TERRAIN → GROUND → MOVEMENT → DECISION.
10. Show Bengali evacuation preview.

## Design Principles
- calm normal state, urgent alert state
- map is the hero
- typography and spacing create luxury, not decorative clutter
- data freshness and provenance are visible
- red reserved for dangerous states
- simulation is always labeled
- no fake scientific certainty
- no exact collapse countdown
- accessible state labels, not color-only communication

## Final M8 Visual Tokens
- Background: `#F5F7FA`
- Surface: `#FFFFFF`
- Elevated: `#EEF3F7`
- Text: `#1F2933`
- Muted: `#586A79`
- Satellite / Space: `#1677C8`
- AI risk: `#6857C9`
- Ground / Healthy: `#08775A`
- Primary accent: `#0F7D72`
- Watch: `#9B6905`
- Warning: `#B84D12`
- Evacuate: `#C8374D`

The final product uses a bright cartographic “Atlas” theme: familiar map-product clarity, white floating surfaces, light land/water geography and high-contrast controls. The semantic colors above stay disciplined and must not become decorative.

## Technical Direction
Frontend-first prototype:
- React + TypeScript + Vite
- Tailwind CSS
- Motion / Framer Motion
- MapLibre GL JS
- Recharts
- Lucide
- local deterministic JSON/GeoJSON

Avoid backend/database/auth until the core demo is complete.

## Scientific Language
Prefer:
- relative risk
- change evidence
- escalating conditions
- simulated telemetry
- prototype backtest
- validation pending
- illustrative demo threshold

Avoid without evidence:
- “87% chance of landslide”
- “will collapse in 2 hours”
- “our AI is more accurate than NASA”
- “real-time satellite warning”
- “field-proven”
