#!/usr/bin/env sh
set -eu

printf '\n[Pahar Prohori] Installing locked dependencies...\n'
npm ci
printf '\n[Pahar Prohori] Running unit/regression tests, lint and production build...\n'
npm run check
printf '\n[Pahar Prohori] Core verification passed.\n'
printf 'Optional browser QA: npm run preview, then run qa:browser with CHROME_PATH.\n'
