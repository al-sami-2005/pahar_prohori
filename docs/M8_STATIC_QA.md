# M8 static QA

This file records checks that do not require installing npm packages.

## Passed

- Local TS/TSX import resolution: **0 missing local imports**.
- Production source `Math.random()` usage: **none**.
- Obvious hard-coded secret patterns: **none found**.
- Slope identifiers: **50 / 50 unique**.
- Sensor identifiers: **6 / 6 unique**; all sensor → slope references resolve.
- Key semantic text colours on white meet WCAG AA for normal text:
  - foreground 14.76:1
  - muted 5.60:1
  - satellite 4.66:1
  - AI 5.53:1
  - ground 5.53:1
  - accent 5.00:1
  - watch 4.75:1
  - warning 5.11:1
  - evacuate 5.11:1

## Runtime gate to run on a connected development machine

```bash
npm ci
npm run check
npm run preview
```

Then, with Chrome/Chromium available:

```bash
CHROME_PATH="/path/to/chrome" npm run qa:browser -- http://localhost:4173/ m8-screenshots
```

The current execution environment could not finish npm dependency installation, so M8 changes were statically audited here rather than falsely reported as runtime-tested.
