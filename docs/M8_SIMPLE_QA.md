# M8 Simple UX — QA notes

## Scope
This pass changes presentation and progressive disclosure only. The following logic files were hash-compared with the pre-pass M8 checkpoint and remained byte-identical:

- `src/lib/alertEngine.ts`
- `src/lib/scenarioConfig.ts`
- `src/data/scenario.ts`
- `src/lib/scenarioClock.ts`
- `src/hooks/useScenario.tsx`
- `src/lib/replayClock.ts`
- `src/data/replayEvidence.ts`
- `src/lib/deployment.ts`

## Static checks completed in the editing environment

- All 104 `src/**/*.ts(x)` files pass TypeScript syntax transpilation.
- Local `@/` and relative imports resolve to existing project files.
- Modified files were checked for unused imported identifiers.
- No alert/scenario/replay/deployment decision logic was changed.

## Full build limitation
The editing environment could not complete `npm ci` because the container npm process failed before installing the package set. Run the existing local verification on a machine with dependencies/network:

```bash
npm ci
npm run test
npm run lint
npm run build
npm run preview
```

Then run the existing browser QA with Chrome if desired.
