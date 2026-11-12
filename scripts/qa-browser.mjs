// Browser QA — reproducible demo-reliability checks (Monsoon Scenario, Replay, Deployment).
//
//   npm run build && npm run preview          (in one terminal)
//   CHROME_PATH=/path/to/chrome npm run qa:browser [-- http://localhost:4173/ [shotDir]]
//
// Measures the real wall-clock duration of the 46 s scenario (normally and under
// 6× CPU throttling), checks that the Guided Demo cannot finish before EVACUATE,
// that Restart works after completion, that the CTA always runs the Batali Hill
// story, and that hidden mobile controls cannot take keyboard focus. M6/M7: the replay
// hindsight lock (post-event evidence hidden before its date), replay autoplay / pause /
// restart, deployment budgets with map ⇄ list sync on one MapLibre instance, and that
// neither route changes the scenario or alert state.
// Needs playwright-core (devDependency) and a local Chrome/Chromium.
import { chromium } from 'playwright-core'

const BASE = process.argv[2] ?? 'http://localhost:4173/'
const SHOTS = process.argv[3] ?? null
const CHROME = process.env.CHROME_PATH
if (!CHROME) {
  console.error('Set CHROME_PATH to a local Chrome or Chromium binary.')
  process.exit(2)
}

const browser = await chromium.launch({ executablePath: CHROME, args: (process.env.CHROME_ARGS ?? '').split(' ').filter(Boolean) })
const results = []
const errors = []
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail })
// QA_ONLY=scenario,replay,deploy runs a subset (default: everything).
const only = (process.env.QA_ONLY ?? '').split(',').filter(Boolean)
const runs = (group) => only.length === 0 || only.includes(group)

async function open(width, height) {
  const page = await browser.newPage({ viewport: { width, height } })
  page.on('pageerror', (e) => errors.push(`[${width}] ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push(`[${width}] ${m.text().slice(0, 200)}`)
  })
  await page.goto(`${BASE}#/`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.node-marker', { timeout: 60_000 })
  await page.waitForTimeout(1200)
  const explore = page.locator('text=Explore on my own')
  if (await explore.count()) await explore.first().click()
  return page
}

const barLevel = (p) =>
  p.evaluate(() => document.querySelector('[role=group][aria-label="Run Monsoon Scenario"]')?.lastElementChild?.textContent?.trim() ?? '')
const ribbonScenario = (p) =>
  p.evaluate(() => {
    const dt = [...document.querySelectorAll('dt')].find((d) => /Scenario/.test(d.textContent ?? ''))
    return dt?.nextElementSibling?.textContent ?? ''
  })

/** Click Run in-page and time level changes and completion with performance.now(). */
async function timeRun(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const level = () => document.querySelector('[role=group][aria-label="Run Monsoon Scenario"]')?.lastElementChild?.textContent?.trim() ?? ''
        const status = () => {
          const dt = [...document.querySelectorAll('dt')].find((d) => /Scenario/.test(d.textContent ?? ''))
          return dt?.nextElementSibling?.textContent ?? ''
        }
        const cta = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Run Monsoon Scenario'))
        const t0 = performance.now()
        cta?.click()
        const seen = {}
        const id = setInterval(() => {
          const t = (performance.now() - t0) / 1000
          for (const l of ['Watch', 'Warning', 'Evacuate']) if (!seen[l] && level().startsWith(l)) seen[l] = +t.toFixed(2)
          if (/Complete/.test(status())) {
            clearInterval(id)
            resolve({ total: +t.toFixed(2), transitions: seen })
          }
        }, 10)
      }),
  )
}

// 1. Wall-clock duration, normal
if (runs('scenario')) {
  const page = await open(1440, 900)
  const r = await timeRun(page)
  check('run completes in ~46 s real time (normal)', Math.abs(r.total - 46) < 1.5, `${r.total} s · ${JSON.stringify(r.transitions)}`)
  // Restart after completion
  await page.click('button[aria-label="Restart"]')
  await page.waitForTimeout(1500)
  check('Restart after completion runs again', /Running/.test(await ribbonScenario(page)), await ribbonScenario(page))
  // Hidden tab pauses explicitly
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(600)
  check('hidden tab pauses the run', /Paused/.test(await ribbonScenario(page)), await ribbonScenario(page))
  await page.close()
}

// 2. Wall-clock duration under 6× CPU throttling
if (runs('scenario')) {
  const page = await open(1440, 900)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })
  const r = await timeRun(page)
  check('run completes in ~46 s real time (6× CPU throttling)', Math.abs(r.total - 46) < 3, `${r.total} s · ${JSON.stringify(r.transitions)}`)
  await page.close()
}

// 3. CTA always runs the Batali Hill story from 0
if (runs('scenario')) {
  const page = await open(1440, 900)
  await page.click('header button:has-text("Find a slope or an area")')
  await page.keyboard.type('CTG-S07', { delay: 15 })
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1200)
  await page.click("button:has-text('Run Monsoon Scenario')")
  await page.waitForTimeout(600)
  const id = await page.evaluate(() => document.querySelector('aside [class*="numeric"]')?.textContent ?? '')
  const progress = await page.evaluate(() => Number(document.querySelector('[role=progressbar][aria-label="Scenario progress"]')?.getAttribute('aria-valuenow')))
  check('CTA selects CTG-S03 and starts at 0', id.includes('CTG-S03') && progress <= 5, `${id} · progress ${progress}%`)
  await page.close()
}

// 4. Guided Demo cannot finish before EVACUATE
if (runs('scenario')) {
  const page = await open(1440, 900)
  await page.click("button:has-text('Guided demo')")
  await page.waitForTimeout(700)
  for (let i = 0; i < 4; i++) {
    await page.click("section[role=dialog] button:has-text('Next')")
    await page.waitForTimeout(700)
  }
  await page.click("section[role=dialog] button:has-text('Start scenario')")
  const finishAt = []
  const t0 = Date.now()
  while (Date.now() - t0 < 90_000) {
    const lvl = await barLevel(page)
    const finish = await page.locator("section[role=dialog] button:has-text('Finish')").count()
    if (finish) finishAt.push(lvl)
    if (/^Evacuate/i.test(lvl) && finish) break
    await page.waitForTimeout(150)
  }
  check('Guided Demo never shows Finish before EVACUATE', finishAt.length > 0 && finishAt.every((l) => /^Evacuate/i.test(l)), `Finish first seen at: ${finishAt[0] ?? 'never'}`)
  // The card cross-fades between steps; wait for the new step's title.
  await page.waitForFunction(() => document.querySelector('#tour-title')?.textContent === 'Human action', null, { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(600)
  const title = await page.locator('#tour-title').textContent()
  const signals = await page.locator("section[role=dialog] >> text=2 independent signals confirmed").count()
  const warning = await page.locator('text=Resident warning · preview').count()
  check('Guided Demo reaches Human action with the warning visible', title === 'Human action' && signals === 1 && warning === 1, `${title} · signals ${signals} · warning ${warning}`)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/guided-demo-evacuate.png` })
  await page.close()
}

// 5. Hidden mobile controls cannot receive keyboard focus
if (runs('scenario')) {
  const page = await open(390, 844)
  await page.click('#map-tools button[aria-label="Layers"]')
  await page.waitForTimeout(500)
  const r = await page.evaluate(() => {
    const bar = document.querySelector('[data-scenario-bar]')
    const buttons = [...(bar?.querySelectorAll('button, [tabindex]') ?? [])]
    buttons.forEach((b) => b.focus())
    const focusedInside = !!bar && bar.contains(document.activeElement)
    return { inert: bar?.inert === true, controls: buttons.length, focusedInside }
  })
  let reached = false
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    if (await page.evaluate(() => !!document.querySelector('[data-scenario-bar]')?.contains(document.activeElement))) reached = true
  }
  check('hidden scenario bar is inert and never takes focus', r.inert && r.controls > 0 && !r.focusedInside && !reached, JSON.stringify({ ...r, tabReached: reached }))
  await page.close()
}

// 6. Replay — hindsight lock: the Chattogram footprint does not exist before 24 Jul
const replayDate = (p) => p.evaluate(() => document.querySelector('[data-replay-date]')?.getAttribute('data-replay-date'))
const footprintSites = (p) => p.evaluate(() => document.querySelector('[data-replay-footprint]')?.getAttribute('data-replay-footprint'))
async function seekReplay(page, index) {
  await page.focus('[data-replay-range]')
  await page.keyboard.press('Home')
  for (let i = 0; i < index; i++) await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(500)
}
if (runs('replay')) {
  const page = await open(1440, 900)
  await page.goto(`${BASE}#/replay`)
  await page.waitForSelector('[data-replay-timeline]')
  await page.waitForTimeout(1200)
  const passState = () =>
    page.evaluate(() => {
      const el = document.querySelector('[data-evidence="chattogram:pass:2026-06-30:069"]')
      return { state: el?.getAttribute('data-state'), window: el?.querySelector('[data-window]')?.textContent ?? '' }
    })

  // Acquisition ≠ availability: the 30 Jun product is processing, then possible, then available by 4 Jul.
  await seekReplay(page, 8) // 30 Jun — acquisition day
  const acq = await passState()
  await seekReplay(page, 10) // 2 Jul
  const mid = await passState()
  await seekReplay(page, 12) // 4 Jul
  const ready = await passState()
  check(
    'replay: NISAR acquisition ≠ availability (30 Jun processing → 2 Jul possibly → 4 Jul available)',
    acq.state === 'processing' && mid.state === 'possible' && ready.state === 'available' && /possibly available from 02 Jul .*conservatively available from 04 Jul/.test(acq.window),
    `${acq.state} → ${mid.state} → ${ready.state} · ${acq.window}`,
  )
  const ranking = await page.evaluate(() => {
    const el = document.querySelector('[data-ranking-note]')
    return { text: el?.textContent ?? '', chip: !!el?.querySelector('[data-knowledge]') }
  })
  check(
    'replay: backtest ranking marked PROTOTYPE BACKTEST + SIMULATED, never "available"',
    /Prototype Backtest/i.test(ranking.text) && /Simulated/i.test(ranking.text) && /not a historical model output/.test(ranking.text) && !ranking.chip,
    ranking.text.slice(0, 90),
  )

  // The illustrative footprint follows the processed pair (24 Jul + latency), not the acquisition date.
  await seekReplay(page, 35) // 27 Jul
  const before = await page.evaluate(() => {
    const fp = document.querySelector('[data-evidence="chattogram:footprint"]')
    return { state: fp?.getAttribute('data-state') }
  })
  const d1 = await replayDate(page)
  const fp1 = await footprintSites(page)
  check(
    'replay: footprint hidden inside its processing window (27 Jul, pair completed 24 Jul)',
    d1 === '2026-07-27' && !fp1.includes('chattogram') && before.state === 'possible',
    `${d1} · map footprints: ${fp1} · list: ${before.state}`,
  )
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/replay-hindsight-lock-27jul.png` })
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(500)
  const after = await page.evaluate(() => document.querySelector('[data-evidence="chattogram:footprint"]')?.getAttribute('data-state'))
  const fp2 = await footprintSites(page)
  check('replay: footprint appears on 28 Jul, only as post-event evidence', fp2.includes('chattogram') && after === 'post-event', `${await replayDate(page)} · ${fp2} · ${after}`)
  await seekReplay(page, 17) // 9 Jul — impact report (11 Jul) not yet known
  const impact = await page.evaluate(() => {
    const el = document.querySelector('[data-evidence="all:impact"]')
    return { state: el?.getAttribute('data-state'), text: el?.textContent ?? '' }
  })
  check('replay: impact report content locked until 11 Jul', impact.state === 'not-yet' && !/30/.test(impact.text), JSON.stringify(impact))

  // 7. Replay — autoplay, pause, resume, restart on the one clock
  await page.click('[data-replay-play]')
  await page.waitForTimeout(2600)
  const playing = await replayDate(page)
  await page.click('[data-replay-play]')
  await page.waitForTimeout(1200)
  const paused1 = await replayDate(page)
  await page.waitForTimeout(1200)
  const paused2 = await replayDate(page)
  check('replay: autoplay advances by wall clock, pause holds the date', playing > '2026-07-10' && paused1 === paused2, `${playing} → paused ${paused1}/${paused2}`)
  await page.click('button[aria-label="Restart replay"]')
  await page.waitForTimeout(400)
  check('replay: restart returns to 22 Jun', (await replayDate(page)) === '2026-06-22', await replayDate(page))
  await page.click('button[role=radio]:has-text("4×")')
  await page.click('[data-replay-play]')
  await page.waitForTimeout(9500)
  check('replay: 4× autoplay stops on 31 Jul', (await replayDate(page)) === '2026-07-31' && (await page.getAttribute('[data-replay-play]', 'data-replay-play')) === 'paused', await replayDate(page))

  // The replay date survives a trip to another route (one clock at the app root).
  await page.goto(`${BASE}#/deploy`)
  await page.waitForTimeout(700)
  await page.goto(`${BASE}#/replay`)
  await page.waitForSelector('[data-replay-timeline]')
  check('replay: date is kept across routes', (await replayDate(page)) === '2026-07-31', await replayDate(page))

  // 8. Replay did not touch the scenario
  await page.goto(`${BASE}#/`)
  await page.waitForTimeout(900)
  check('replay leaves the monsoon scenario on Standby', /Standby/.test(await ribbonScenario(page)), await ribbonScenario(page))
  await page.close()
}

// 9. Deployment — budgets, map ⇄ list numbering and hover sync on one map instance
if (runs('deploy')) {
  const page = await open(1440, 900)
  await page.goto(`${BASE}#/deploy`)
  await page.waitForSelector('.deploy-marker')
  await page.waitForTimeout(1200)
  await page.evaluate(() => {
    document.querySelector('.maplibregl-canvas').__qaTag = 'first'
  })
  const counts = []
  for (const b of [5, 10, 25, 50, 10]) {
    await page.click(`[data-budget="${b}"]`)
    await page.waitForTimeout(500)
    const r = await page.evaluate(() => {
      const markers = [...document.querySelectorAll('.deploy-marker:not([data-phase="leave"])')]
      const rows = [...document.querySelectorAll('[data-row]')]
      const byMarker = Object.fromEntries(markers.map((m) => [m.getAttribute('data-slope'), m.textContent]))
      const numbersMatch = rows.every((r) => byMarker[r.getAttribute('data-row')] === r.getAttribute('data-position'))
      const statusMatch = rows.every((r) => document.querySelector(`.deploy-marker[data-slope="${r.getAttribute('data-row')}"]`)?.getAttribute('data-status') === r.getAttribute('data-status'))
      return { markers: markers.length, rows: rows.length, numbersMatch, statusMatch }
    })
    counts.push(`${b}:${r.markers}/${r.rows}`)
    check(`deploy: budget ${b} → ${b} rows and ${b} numbered markers, numbers + status match`, r.markers === b && r.rows === b && r.numbersMatch && r.statusMatch, JSON.stringify(r))
  }
  // Let the camera settle on the re-framed plan before pointing at markers.
  await page.waitForTimeout(1500)
  const sameCanvas = await page.evaluate(() => document.querySelectorAll('.maplibregl-canvas').length === 1 && document.querySelector('.maplibregl-canvas').__qaTag === 'first')
  check('deploy: budget changes never remount MapLibre', sameCanvas, counts.join(' '))
  const summary = await page.evaluate(() => [...document.querySelectorAll('[data-sum]')].map((e) => e.textContent).join(' | '))
  check('deploy: summary for 10 nodes = 10 selected, 2 existing, 8 proposed', /10 nodes in plan.*10 candidate slopes selected.*2 already have simulated demo nodes.*8 proposed placements/.test(summary), summary)

  await page.hover('[data-row="CTG-S05"]')
  await page.waitForTimeout(250)
  const rowToMarker = await page.getAttribute('.deploy-marker[data-slope="CTG-S05"]', 'data-active')
  await page.hover('.deploy-marker[data-slope="CTG-S04"]')
  await page.waitForTimeout(250)
  const markerToRow = await page.getAttribute('[data-row="CTG-S04"]', 'data-active')
  check('deploy: hovering a row highlights its marker, and the reverse', rowToMarker === 'true' && markerToRow === 'true', `row→marker ${rowToMarker} · marker→row ${markerToRow}`)
  await page.click('.deploy-marker[data-slope="CTG-S03"]')
  await page.waitForSelector('[data-why-heading]', { timeout: 5000 }).catch(() => {})
  const why = await page.evaluate(() => ({ h: document.querySelector('[data-why-heading]')?.textContent, rec: document.querySelector('[data-why-rec]')?.getAttribute('data-why-rec'), text: document.querySelector('[data-why]')?.textContent ?? '' }))
  // The only mention of "optimal" allowed is the caveat that says it is not one.
  const optimalMentions = (why.text.match(/optimal/gi) ?? []).length
  check(
    'deploy: marker opens "Why this location?" — existing node kept, never called optimal',
    why.h === 'Priority #3' && why.rec === 'existing' && optimalMentions === 1 && /not an optimal placement/.test(why.text),
    JSON.stringify({ h: why.h, rec: why.rec, optimalMentions }),
  )

  // Escape returns from the explanation to the list; the budget then survives a trip to another route.
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-budget="25"]')
  await page.click('[data-budget="25"]')
  await page.goto(`${BASE}#/replay`)
  await page.waitForTimeout(600)
  await page.goto(`${BASE}#/deploy`)
  await page.waitForSelector('.deploy-marker')
  check('deploy: budget is kept across routes', (await page.getAttribute('[data-budget="25"]', 'aria-checked')) === 'true')

  // 10. Deployment did not touch alert or scenario state
  await page.goto(`${BASE}#/`)
  await page.waitForTimeout(900)
  const alerts = await page.evaluate(() => {
    const dt = [...document.querySelectorAll('dt')].find((d) => /Alerts/.test(d.textContent ?? ''))
    return dt?.nextElementSibling?.textContent ?? ''
  })
  check('deployment leaves alerts and the scenario untouched', /None active/.test(alerts) && /Standby/.test(await ribbonScenario(page)), `${alerts} · ${await ribbonScenario(page)}`)
  await page.close()
}

await browser.close()
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  — ${r.detail}` : ''}`)
console.log(errors.length ? `\nRuntime errors:\n${errors.join('\n')}` : '\nNo runtime errors.')
process.exit(results.every((r) => r.ok) && errors.length === 0 ? 0 : 1)
