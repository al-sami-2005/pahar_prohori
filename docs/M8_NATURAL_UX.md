# M8 Natural UX Refresh

This pass changes presentation only. Alert logic, scenario timing, Replay hindsight logic, and Deployment ranking remain unchanged from the M8 Simple UX checkpoint.

## Direction

The interface now follows familiar consumer-map principles:

- map stays visually dominant;
- header is split into small floating controls instead of one dense toolbar;
- current page is selected from one clear view menu;
- slope/area search is exposed in the header on desktop;
- mission health is reduced to one small status capsule;
- secondary controls use progressive disclosure;
- surfaces use warm white / paper neutrals, soft forest accents, and sky/water blues;
- panel borders are visually minimized in favor of spacing and soft elevation;
- buttons use familiar rounded shapes with larger touch targets and stronger contrast.

The implementation is inspired by general patterns seen in mainstream map products (streamlined map toolbars, familiar control placement, progressive disclosure), not copied from any single product.

## Natural palette

- warm canvas: `#F7F6F1`
- surface: `#FFFFFF`
- elevated sage neutral: `#F1F4EF`
- primary text: `#21302A`
- muted text: `#5E6F66`
- primary forest accent: `#216C59`
- ground / healthy: `#2A7A5A`
- satellite / water-sky: `#2B7899`
- AI / risk: `#77658F`
- sea: `#DCEEF0`

Alert colours remain semantically separate from the map/risk palette.

## Header

Desktop is now composed of floating islands:

1. brand;
2. current-view dropdown;
3. slope/area search on Mission;
4. Guided Demo;
5. optional language / status controls;
6. a small centered live-status capsule.

Mobile keeps only the essential brand, current-view control, Guided Demo icon, and compact status capsule.

## Map and body

- land uses warm off-white instead of flat gray;
- sea and water are softer blue;
- boundaries and roads use low-contrast natural neutrals;
- risk polygons are desaturated and do not resemble alerts;
- ground nodes use forest green;
- map cards use 18–22 px radii and soft elevation;
- page drawers/sheets retain their behavior but use quieter surfaces and more breathing room;
- Method, Replay, and Deployment use the same natural surface language.

## Integrity guarantee

Compared byte-for-byte with the previous M8 Simple UX checkpoint, the following remain unchanged:

- `src/lib/alertEngine.ts`
- `src/data/scenario.ts`
- `src/lib/scenarioConfig.ts`
- `src/lib/scenarioClock.ts`
- `src/data/replayEvidence.ts`
- `src/lib/replayClock.ts`
- `src/lib/deployment.ts`
- `src/hooks/useReplay.tsx`
- `src/hooks/useScenario.tsx`

## Verification performed here

- all 104 TypeScript / TSX source files were syntax-parsed successfully;
- zero missing local imports were found;
- critical scientific/state files above were hash/byte compared and unchanged.

Full npm build/test execution still requires a complete dependency installation on the target machine.
