# M8.1 Static QA

## Passed

- TypeScript/TSX syntax scan: 113 files, 0 syntax errors.
- Local import resolution: 0 missing local imports.
- Core scientific / scenario / replay / deployment logic hashes unchanged.
- No `node_modules`, `dist`, `.git`, or `.env` is included in the release archive.

## Responsive issues specifically addressed

- Duplicate first-load CTA stack on mobile.
- Brand / route / status / onboarding controls competing above the fold.
- Oversized mobile location card.
- Persistent three-item bottom map toolbar.
- Mobile telemetry capsule colliding with map controls.
- Floating-card overload in the selected-slope sheet.
- Centered Guided Demo card obscuring the map.
- Desktop navigation becoming crowded around 1024–1180 px.

## Manual checks still recommended

Run on a real iPhone/Safari and Chrome desktop after `npm ci`:

1. 390×844 first load — onboarding should be the only bottom sheet; scenario CTA hidden.
2. 390×844 Explore map — location selector top-left, Layers/Tools top-right, no bottom toolbar.
3. 390×844 selected slope — full-width bottom sheet; scenario control remains reachable above it.
4. 430×900 Guided Demo — tour card does not overlap location or map controls.
5. 820×900 — compact header uses Search/Menu without crowding.
6. 1024×768 — compact-desktop header does not show all navigation and search simultaneously.
7. 1440×900 — full nav + search + Guided Demo remain balanced.
8. Replay / Deployment mobile sheets remain usable with the new 64 px header.
