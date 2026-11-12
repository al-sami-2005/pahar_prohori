# Design audit — before the refinement pass

Short internal audit of Mission Control as of the M3 backup, to guide the refinement pass.

## 1. Current strengths
- Map-first composition: the map fills the whole viewport and the controls float over it, with no card grid.
- An honest data model. Every value has provenance, simulated data is labelled, and the Relative Risk Index is never shown as a probability.
- Colour follows the product thesis: space is cyan, AI is iris, ground is mint, and alerts run amber, orange and red.
- The base map uses real geography and works offline, and the map can't be left stuck on a loader.
- The foundations are solid: hash routes, one persistent map, a Focus Mode camera, EN/BN, and deterministic scenario state.

## 2. Current weaknesses
- The surfaces are very dark and low-contrast. Land, sea and chrome blur together, and the map reads as "empty dark".
- Important controls are too quiet:
  - the navigation tabs are plain text;
  - the rail tools are unlabeled icons;
  - "Why this status?" and Focus mode are easy to miss.
- A first-time viewer isn't told what they're looking at or what to do first.
- Replay, Deployment and Method are placeholder cards, so the product feels unfinished beyond Mission.
- Small metadata (11 px text in the "faint" colour) is hard to read, especially on projectors.

## 3. Visual identity problems
- The palette is generic "dark SaaS" (lime CTA on near-black). Nothing about it is memorable or specific to Pahar Prohori.
- The top chrome is a gradient scrim, not a designed object. The product has no signature element.
- Legend text floats on the map without a surface and competes with map labels.

## 4. Accessibility problems
- The faint text colour (#5D7485) is below AA contrast and is used for source lines.
- Several touch targets are 28–36 px, and the rail buttons, HUD buttons and language switch are too small for touch.
- The focus ring is cyan, the same colour as the NISAR evidence layer on the map, so it's ambiguous.
- The selected slope is marked only by a thin white outline.
- There's no skip link, and slopes can only be reached with the keyboard through the rail panels.

## 5. Discoverability problems
- There's no guided path. The demo story depends on the presenter knowing where everything is.
- Quick, high-value actions ("show AI risk", "go to the highest-risk slope") take several clicks.
- Rail tools reveal their names only on hover, which doesn't work on touch devices.
- Focus mode is invisible until a slope is selected.

## 6. What this pass improves
1. **New palette:** deep navy with a pale-aqua signature accent (#7CF7E3). Surfaces and map base are lighter, and the text is higher-contrast.
2. **Command capsule:** a floating top bar with icon tabs, a visible active state, a Guided demo entry point and a clearer telemetry ribbon.
3. **Labelled rail:** it expands to show labels, gains a Quick actions section, and has richer tooltips.
4. **Onboarding card:** explains the map in one sentence and three keys, and offers "Start guided demo" or "Explore".
5. **Guided demo:** a step-by-step tour that drives the real UI (layers, ranking, focus, scenario).
6. **Map:** more legible labels, a stronger selected-slope treatment (accent edge and lift), and a map key panel.
7. **Accessibility:**
   - body and meta text reach AA contrast;
   - touch targets are at least 40 px (44 px on mobile);
   - the focus ring uses the accent colour;
   - a skip link is added.
8. **Responsive layouts** for 1440/1366 laptops, 1024 tablet landscape, 820/768 portrait and 430/390 phones. On smaller screens the drawer becomes a bottom sheet and the tools move to a bottom bar.
9. **Replay, Deployment and Method** become intentional route-level experiences:
   - Replay gets a timeline driven by the real NISAR pass metadata.
   - Deployment gets a working budget selector with map highlighting.
   - Method gets a full provenance and methodology page.
