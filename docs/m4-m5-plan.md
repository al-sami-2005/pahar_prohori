# M4 + M5 — Slope Intelligence, Evidence Chain, Monsoon Scenario

Short implementation note. The visual system is locked; this milestone makes the
existing surfaces come alive from one shared state.

## What exists (inspected before building)

| Piece | Before | After |
|---|---|---|
| Alert engine | `lib/alertEngine.ts` — 4 boolean signals → level | Pure `evaluateAlert(inputs)` → level, triggered conditions, evidence states, decision basis, independent-signal count, reason code |
| Thresholds | `DEMO_THRESHOLDS` in the engine file | `lib/scenarioConfig.ts` — every timing value and illustrative threshold, nowhere else |
| Scenario | `useScenario` — a 42 s RAF timer with no data | Same provider, now the **only clock**: status + elapsed, quantised to 100 ms frames |
| Telemetry | `data/telemetry.ts` — resting values only | `data/scenario.ts` — deterministic frames for every affected slope, precomputed once |
| Drawer | Static rows + placeholder "Why this status?" | Live sections with sparklines + a real Evidence Chain view |
| Map | Rest alert feature-state set once on load | `ScenarioMapSync` diffs alert levels per frame (no MapLibre re-init) |
| Guided Demo | 6 steps, ends before the scenario | Drives the real app through the scenario, evidence and warning |

## Single source of scenario truth

```
ScenarioProvider (one RAF loop, one reducer)
  status: idle | running | paused | complete
  elapsedMs → frame = floor(elapsed / 100 ms)
        │
        ▼
data/scenario.ts (pure, precomputed at module load)
  frames[slopeId][frame] = { reading, decision }     ← evaluateAlert() per frame
  events (derived from the hero's decisions, never hard-coded)
        │
        ▼  useSlopeLive(id) · useAlertLevels() · useScenarioEvents()
ribbon · map sync · node markers · drawer · sparklines · Evidence Chain ·
decision basis · scenario bar · resident warning · announcer · Guided Demo
```

- Idle → every consumer reads the resting frame (`frame = null`).
- Paused → the frame freezes; nothing recomputes.
- Complete → the last frame stays on screen until Restart or Exit.
- Exit → back to idle; the map and alerts return to rest. No timer survives.
- Leaving Mission while running pauses the scenario (nothing runs unseen).

There is exactly one timer. Charts, map, alerts and the tour never own time.

## Alert engine — inputs / outputs

Inputs (all current conditions except `relativeRisk` and `nisarChange`):
`relativeRisk`, `rainfallRate`, `rainfall1h`, `rainfall24h`, `rainfallSource`,
`topsoilMoisture`, `deepSoilMoisture`, `tiltDelta`, `movementTrend`,
`sensorAgeMin`, `nisarChange`, `signalAgreementMin`, `config`.

Outputs: `alertLevel`, `triggeredConditions`, `evidenceStates`
(space · environment · terrain · ground · movement · decision), `basis`
(rain continuing · ground saturation · movement), `independentSignals`,
`decisionExplanation` (a reason code the UI translates), `capped`.

Rules (ILLUSTRATIVE DEMO THRESHOLDS — NOT OPERATIONAL):

1. **EVACUATE** — ground saturation AND movement, both confirmed by the ground
   node, agreeing for the hold period. Two independent in-situ signals.
2. **WARNING** — rain continuing AND ground near saturation; or both in-situ
   signals agree but the hold period is still running ("confirming").
3. **WATCH** — meaningful rainfall on a high/critical-susceptibility slope, or
   one in-situ signal on its own.
4. **NORMAL** — none of the above.

Relative Risk Index only gates WATCH (rain matters more on susceptible slopes).
It can never raise an alert by itself and never contributes to EVACUATE.
Slopes without a ground node are capped at WATCH.

## Deterministic timeline

- 46 s run, 461 frames at 100 ms; compressed clock 1 s ≈ 15 min of storm.
- Curves are keyframes with monotone cubic interpolation; rainfall 1 h / 24 h
  are integrated from the rate, so the numbers stay consistent.
- No `Math.random`, no wall-clock input: frame N is identical on every run.
- Transition times are measured from the engine output and listed in the
  final report, not asserted by the UI.

Phases (narrative labels): 0–7 s baseline · 7–17 s heavy rain · 17–29 s
saturation developing · 29–38 s slope response · 38–46 s movement confirmed.

## Measured timeline (engine output for Batali Hill · Sector 03 / NODE-03)

Every row below is read back from `evaluateAlert()` frame by frame — the UI
never hard-codes a transition. All 23,050 frames (50 slopes × 461) hash
identically across runs.

| t (s) | Storm clock | Phase | Status | What changed | Rain mm/h · 24 h | Topsoil · deep | Tilt |
|---|---|---|---|---|---|---|---|
| 0.0 | +0:00 | Baseline | NORMAL | Moderate rain, ground stable | 2.4 · 38 | 58 % · 49 % | +0.01° |
| 7.1 | +1:47 | Heavy rain | **WATCH** | Rain ≥ 10 mm/h on a critical-susceptibility slope | 10.4 · 45 | 59 % · 50 % | +0.01° |
| 12.2 | +3:03 | Heavy rain | WATCH | Ground starts CONTRIBUTING (topsoil ≥ 75 %) | 30.9 · 73 | 75 % · 58 % | +0.01° |
| 14.5 | +3:38 | Heavy rain | WATCH | Rain CONFIRMED continuing (≥ 10 mm/h after ≥ 90 mm) | 29.2 · 90 | 82 % · 69 % | +0.01° |
| 17.5 | +4:23 | Saturation | **WARNING** | Deep soil ≥ 85 % while rain continues | 32.3 · 114 | 89 % · 85 % | +0.01° |
| 23.1 | +5:47 | Saturation | WARNING | 9 un-instrumented slopes reach WATCH (GPM, ~4 h late) — capped | — | — | — |
| 35.3 | +8:50 | Slope response | WARNING | Tilt change begins — movement CONTRIBUTING | 28.9 · 252 | 97 % · 94 % | +0.08° |
| 38.1 | +9:32 | Movement | WARNING | Movement CONFIRMED → **2 independent signals** (hold starts) | 30.0 · 272 | 97 % · 95 % | +0.25° |
| 39.5 | +9:53 | Movement | **EVACUATE** | Both signals agree for 20 storm-minutes | 29.2 · 283 | 97 % · 95 % | +0.32° |
| 46.0 | +11:30 | Movement | EVACUATE | Run complete (last frame stays on screen) | 26.0 · 327 | 97 % · 96 % | +0.50° |

Other gauged slopes: NODE-01 (Foy's Lake, high) reaches WATCH at 7.3 s and stays
there (never saturates); NODE-02 and NODE-04 (moderate susceptibility) stay
NORMAL — heavy rain alone only raises WATCH on high/critical slopes.

## Reliability patch (after independent audit)

- **Wall-clock clock.** `lib/scenarioClock.ts` (pure) derives scenario time from
  `performance.now()`: `elapsed = base + (now − anchor)`. A slow renderer skips
  visual frames; it never stretches the run. Pause banks the time, Resume re-anchors,
  Restart starts at exactly 0, Exit returns to idle. One loop per running stretch.
  A hidden tab pauses the run explicitly (the presenter resumes it).
- **Guided Demo gate.** `lib/tour.ts`: step 6 *Evidence confirmation* runs the real
  scenario with no Next/Finish; step 7 *Human action* `requires: 'evacuate'` and is
  entered automatically when the engine reports EVACUATE. Finish exists only there.
- **One run path.** CTA, bar Restart and Guided Demo call `useScenarioControls().run()`:
  select CTG-S03 (switches to Chattogram), reset the warning, start at 0.
- **NISAR provenance.** Acquisition pair = NASA DATA (catalog metadata); change
  footprint = ILLUSTRATIVE. The UI never says a change was "detected".
- **Hidden controls.** Overlays hidden under a tool sheet are `inert`.
- **Tests.** `npm run test` (Vitest, dev-only; separate `vitest.config.ts` and
  `tsconfig.test.json`, so the production build never loads it).
  `npm run qa:browser` for wall-clock and interaction checks in a real browser.
