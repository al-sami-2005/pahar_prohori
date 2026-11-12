# M8.1 — Humanized Responsive UX

This pass is a presentation-only refinement of the M8 natural-map build. It deliberately leaves scientific logic, scenario timing, replay hindsight rules, and deployment ranking unchanged.

## Design goal

Make Pahar Prohori feel like a familiar consumer mapping product first, and a technical intelligence system second. A new user should immediately recognize the map, location selector, search, layers, and menu without decoding a dashboard.

## Major changes

- Replaced the collection of floating header pills with one calm full-width app bar.
- Desktop navigation now uses ordinary text tabs with a simple active underline.
- Search is part of the header on roomy screens and a familiar icon on smaller screens.
- Mobile header contains only brand, Search and Menu.
- Status/telemetry is no longer permanently stacked over the map on phones; it remains available inside Menu.
- Simplified the Pahar Prohori brand mark to a standalone hill + watch point + radar arc.
- Removed the large mobile “Chattogram Hills” card. Phones show only the location selector; desktop keeps lightweight map context without a boxed dashboard surface.
- Reduced map chrome to Layers + Menu; scientific tools are progressively disclosed.
- Removed the mobile bottom toolbar so the map has more usable vertical space and fewer controls compete with Safari/browser chrome.
- First-run help is now a compact bottom sheet. The duplicate scenario CTA is suppressed while onboarding is visible.
- Mobile tool panels and slope details use full-width bottom-sheet behavior rather than stacked floating cards.
- Flattened slope intelligence: status, risk, evidence entry point, telemetry rows and technical disclosure use dividers/typography instead of nested rounded cards.
- Guided Demo is now a smaller contextual walkthrough card rather than a large centered modal on desktop.
- Scenario controls use calmer rounded-rectangle geometry instead of another oversized pill.
- Replay and Deployment use full-width mobile sheets for better reachability.
- Method page was flattened into a document-like layout with simple sections and disclosure rows.

## What was intentionally NOT changed

Byte-for-byte unchanged in this pass:

- `src/lib/alertEngine.ts`
- `src/data/scenario.ts`
- `src/lib/scenarioConfig.ts`
- `src/lib/replayClock.ts`
- `src/data/replayEvidence.ts`
- `src/lib/deployment.ts`
- `src/hooks/useScenario.tsx`
- `src/hooks/useReplay.tsx`

No alert thresholds, scenario timing, temporal hindsight rules, or deployment ranking logic were changed.

## Responsive philosophy

### Mobile
- 64 px app bar: brand + Search + Menu only.
- Location selector floats below the app bar.
- Layers + Menu are two compact map controls on the right.
- First-run onboarding is a bottom sheet and hides the idle scenario CTA until dismissed.
- Selected slope becomes a full-width bottom sheet.
- Search/layer/tool panels become bottom sheets.

### Tablet / compact desktop
- Primary navigation collapses before it becomes crowded.
- Search becomes an icon when horizontal space is limited.
- Existing bottom-sheet behavior remains for detailed inspection.

### Desktop
- One header surface replaces multiple disconnected capsules.
- Navigation is conventional text navigation.
- Search is directly visible on Mission Control.
- Map context is text-first rather than a large white card.

## Verification performed in the editing environment

- Parsed/transpiled all TypeScript and TSX source/test files with the TypeScript compiler API: **0 syntax errors**.
- Checked all local `@/` and relative imports: **0 missing local imports**.
- Critical scientific/state files were SHA-256 compared before and after the pass: **unchanged**.
- A full npm install/build could not be executed because one dependency tarball was not available in the sandbox npm cache (`why-is-node-running@3.2.2`).

Run the full gate on a development machine:

```bash
npm ci
npm run test
npm run lint
npm run build
npm run qa:browser -- http://localhost:4173/
```
