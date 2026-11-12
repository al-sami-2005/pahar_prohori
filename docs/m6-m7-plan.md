# M6 + M7 — Event Replay and Guardian Deployment Planner

Both features extend the same product: the same map instance, the same slope
objects (`data/slopes.ts`), the same Relative Risk Index ranking, the same
provenance labels. Mission Control, the alert engine, the scenario clock and the
Guided Demo are untouched.

## 1. Replay state architecture

`lib/replayClock.ts` — pure, like `scenarioClock.ts`:

```
ReplayClock { basePos, anchorMs, playing, speed (1|2|4) }
position(now) = playing ? basePos + (now − anchorMs) / (MS_PER_DAY / speed) : basePos
currentDay    = REPLAY_DAYS[floor(position)]        // 22 Jun … 31 Jul 2026 (40 days)
actions: play · pause · seek(day) · step(±n) · restart · setSpeed · tick — each carries `now`
```

`hooks/useReplay.tsx` — one provider at the app root (so the date survives route
changes within a session), one rAF loop that dispatches only when the day index
changes, pause on hidden tab, pause when leaving the Replay route. Scrubbing,
keyboard, key-date stepping and autoplay all dispatch into the same reducer.
The site is the shared site selection (`useMission().state.site`) — the same site
switch as Mission; no second site state.

## 2. Temporal-availability rules

```
isAvailableAt(e, day) = e.availableAt ≤ day
knowledgeAt(e, day)   = not-yet     if day < e.availableAt
                        post-event  if e.role = 'validation'
                        available   otherwise
BACKTEST_CUTOFF = 5 Jul 2026. Anything with availableAt ≥ cutoff can never be a
prediction input (enforced in data, asserted in tests).
```

`availableAt` = the earliest date the item could have been used. For NISAR passes
and pairs this is the acquisition date — product latency is not modelled, so it
is an optimistic lower bound (stated in the UI).

## 3. Event timeline data model (`data/replayEvidence.ts`)

Built from existing data, never duplicated:

| Item | From | observedAt → availableAt | Role |
|---|---|---|---|
| Pre-event risk ranking | `slopes` (Mission RRI) | 22 Jun → 22 Jun | prediction input (placeholder values) |
| NISAR passes | `NISAR_PAIRS` via `passesFor()` | pass date → pass date | input if before cutoff, else validation |
| Change footprint | `primaryPair(site)` | pair `after` date | validation (illustrative) |
| Reported rainfall 412.3 mm | replay facts (BMD, as reported) | 7 Jul → 7 Jul | event record |
| Impact report ≥ 30 deaths | replay facts (The Star/AFP) | 5–11 Jul → 11 Jul | event record, no locations |
| NISAR data gap | catalog note | 27 Jul → 10 Aug | context band |
| Event window, cutoff | replay constants | 5–11 Jul, 5 Jul | context |

No landslide coordinates exist in the project, so none are plotted.

## 4. "Known then" vs "known later"

Existing provenance language, extended with two labels: **Reported** (event data
reported by agencies/press) and **Post-event** (evidence that exists only after the
cutoff). States shown per item: AVAILABLE THEN · NOT AVAILABLE YET · POST-EVENT
EVIDENCE, alongside NASA DATA / SIMULATED / ILLUSTRATIVE / VALIDATION PENDING.
Not-yet items show only their title and availability date, never their content.
Map: pre-event layers keep normal styling; the post-event footprint uses a
secondary treatment (faint hatch + dashed outline) and only appears once available.

## 5. Validation-state model

Hit rate, false-alarm area and LHASA comparison are `status: 'not-measured'` with a
plain-language definition each. No numbers exist in code. The question is framed,
never answered; VALIDATION PENDING stays visible at every date.

## 6. Deployment ranking architecture (`lib/deployment.ts`, pure)

```
candidates = slopes (already ordered by Mission rank: RRI desc, ties by slope ID)
             filtered to scope (All sites | Chattogram | Ukhiya–Teknaf)
plan(N)    = first N candidates, one node per slope
```

No other factors: population, exposure and cost are not in the data. The UI says
"Prototype priority ranking currently orders slopes by Relative Risk Index" and
never calls it optimal. Budget > candidates → all candidates assigned, remainder
reported as unassigned.

## 7. Existing vs proposed nodes

A plan item is `existing` if the slope already carries a simulated demo node
(`slope.sensorId`), else `proposed`. Existing items keep their node ("Node already
present") — never a second one. Map: the demo node stays a solid mint marker; the
plan marker is a numbered mint circle — solid for existing, outlined for proposed.
The number on the map equals the list position.

## 8. Shared map / slope integration

One MapLibre instance. Route views extend `MapView`:
- `replay { footprint: boolean }` → risk on, footprint via post-event layers, nodes off.
- `deploy { ids, existing, hovered }` → risk on, chosen outline, numbered markers
  diffed in place (enter/leave), hover via feature-state.
Selection reuses `select`; changing route clears it.

## 9. Responsive behaviour

- Replay desktop: left question/knowledge/validation column + bottom timeline dock;
  map top-right. Tablet/phone: map on top, bottom sheet with a sticky date/controls
  header, ±day and previous/next key-date buttons (no precision dragging needed).
- Deployment desktop: map + right planner panel. Tablet/phone: map + bottom sheet;
  "Why this location?" replaces the list inside the same surface.

## 10. QA strategy

Unit (Vitest): replay clock, availability/hindsight lock, cutoff, site filtering,
determinism; deployment budgets, ordering, uniqueness, existing nodes, prefix
property, scope, determinism; cross-feature regression (scenario timeline and
engine untouched). Browser (`npm run qa:browser`): hindsight lock on the map,
replay autoplay, deployment map/list sync, plus the existing M5 checks.

## As built — deviations from the plan

- **Replay map view carries footprint availability per area** (`{ kind: 'replay', footprintSites }`) instead of one boolean, so switching area can never flash the other area's footprint before its date. The post-event layers are filtered by that list.
- **Post-event footprints get a neutral ring** (`nisar-post-ring`, from footprint centroids) in addition to the counter-hatch and dashed outline — the real footprints are ~100 m across and invisible at site zoom otherwise. Same neutral colour, never satellite blue or alert red; legend says "Post-event footprint · illustrative".
- **Text follows the hindsight lock too**: before an item's availability date the knowledge list, timeline tooltips and screen-reader labels show only its kind ("Impact report"), never its content ("at least 30 deaths"). The reported 412.3 mm bar is drawn dashed and unlabelled until 7 Jul.
- **Telemetry ribbon**: the NISAR pair item (e.g. "30 Jun → 24 Jul") is hidden on the Replay route only, because it would sit above an earlier replay date. The ribbon is otherwise unchanged.
- **Timeline markers are grouped by date** (and, on phones, adjacent dates share one button) so hit targets never overlap; the cutoff flag has its own row.
- **Deployment markers step aside before they hide**: a lower-priority marker that would overlap a higher one moves to a nearby free spot (±22 px); it hides only when none is free. Hovered/selected markers always keep their place.
- **Planner summary** also shows the site split ("6 in Chattogram · 4 in Ukhiya–Teknaf") in the all-sites scope.
- `missionReducer` / `initialMissionState` are exported from `hooks/useMission.tsx` for the regression tests (no behaviour change).

## Temporal-methodology patch (after M6/M7 review)

- **NISAR acquisition ≠ availability.** Each NISAR item carries `acquiredAt`, `availabilityEarliest` and `availabilityLatest`. The stated processing latency is ~36–72 h; the catalog has day-level dates only, so the window is widened to whole replay days judged at their start: *acquired — processing* on the acquisition day and the next, *possibly available* on days +2 and +3, *available by this date* from day +4. `availableAt` (the hindsight lock) = `availabilityLatest`. No delivery time is invented; the UI says "Availability is conservatively shown after the stated processing-latency window; exact delivery time is not known."
- **Prediction inputs** are only acquisitions whose processed product is conservatively available before the 5 Jul cutoff (a late pre-cutoff acquisition would be excluded: `rev.pass.late.why`).
- **Footprint** follows its processed pair: Chattogram pair completes 24 Jul → shown from 28 Jul; Ukhiya–Teknaf 12 Jul → 16 Jul. Always ILLUSTRATIVE + POST-EVENT, never an observed NASA landslide footprint.
- **Ranking** is no longer an evidence item: `BACKTEST_RANKING` — PROTOTYPE BACKTEST + SIMULATED, "a prototype placeholder reconstructed from permitted pre-cutoff inputs. It is not a historical model output." It has no availability date and no knowledge state; the risk polygons stay on the map.
- **Timeline** unchanged in structure: acquisitions sit on their acquisition date (outline diamond while processing, filled once available); the footprint marker sits on its availability date; availability dates are extra previous/next stops. Window details live in the tooltip and the evidence list.
