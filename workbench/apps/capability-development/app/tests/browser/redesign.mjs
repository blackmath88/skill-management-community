/**
 * Browser checks for the redesigned experience.
 *
 * Drives the real built application and the real IndexedDB through the short flow — first visit,
 * plan, optional rehearsal, real attempt, reflection, the return to Home, a memory on the mobile,
 * supporting evidence — and then checks the things a redesign is most likely to break: that every
 * earlier address still opens a page, that personal and demo records stay apart, that an export
 * carries the mobile and imports again, and that the shell works from the keyboard and on a
 * narrow screen with reduced motion.
 *
 * Playwright is resolved from the environment, as in journey.mjs. If it is not resolvable the
 * script says so and exits non-zero rather than reporting a pass it did not run.
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const DIST = resolve(HERE, '../../dist')
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
const SHOTS = process.argv[2] ?? null

const requireFrom = createRequire(import.meta.url)
let playwright
for (const attempt of [
  () => import('playwright'),
  () => Promise.resolve(requireFrom('playwright')),
  () => Promise.resolve(requireFrom(resolve(process.env.NODE_PATH ?? '', 'playwright'))),
]) {
  try {
    playwright = await attempt()
    break
  } catch {
    // next
  }
}
if (!playwright?.chromium) {
  console.error('Playwright is not resolvable here; the redesign checks were NOT run.')
  process.exit(1)
}

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '')
  const file = join(DIST, path === '/' || path === '\\' ? 'index.html' : path)
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/`

let passed = 0
const failures = []
function check(ok, label, detail = '') {
  if (ok) {
    passed += 1
    console.log(`  ok   ${label}`)
  } else {
    failures.push(label)
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
}
async function sees(page, text, label) {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 5000 })
    check(true, label)
  } catch {
    check(false, label, `expected to see "${text}"`)
  }
}
async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true })
}

const browser = await playwright.chromium.launch()
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true })
  const page = await context.newPage()
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))

  console.log('\nFirst visit')
  await page.goto(base)
  await sees(page, 'Prepare for a conversation you are not looking forward to.', 'an empty record set opens on an invitation')
  check((await page.locator('.mobile svg').count()) === 1, 'the mobile is drawn, complete, with no records at all')
  await sees(page, 'It is complete as it is.', 'and it says it needs nothing')
  check((await page.locator('.memory-list button').count()) === 0, 'no memory is invented for a new person')
  await shot(page, 'flow-1-first-visit')

  console.log('\nPlan')
  await page.getByRole('link', { name: 'Prepare a discussion' }).first().click()
  await sees(page, 'Prepare a difficult discussion', 'the main action leads straight to the plan')
  await page.getByRole('button', { name: 'Save the plan' }).click()
  await sees(page, 'A short title is required', 'saving an empty form is refused with a real reason, and says so')
  check((await page.getByText('Saved in this browser.').count()) === 0, 'and it does not claim to have saved')
  await page.getByLabel('What is it about?').fill('Who decides the release date')
  await page.getByLabel(/Where, and with whom/).fill('Weekly team meeting')
  await page.getByLabel('When will you raise it?').fill('When we reach the release item on Thursday')
  await page.getByLabel('How will you open?').fill('Before we discuss dates: who here can decide the date?')
  await shot(page, 'flow-2-plan')
  await page.getByRole('button', { name: 'Save the plan' }).click()
  await page.waitForURL(/#\/activity\//)
  await sees(page, 'Raise it: Who decides the release date', 'an unfinished plan is saved and opens as an activity')
  await sees(page, 'To be ready this needs', 'which says what is still missing')
  await page.getByLabel('Obstacle you expect').fill('Somebody answers with a date instead of a name')
  await page.getByLabel('What you will do instead if the obstacle appears').fill('Ask the question once more, then take it to the sponsor')
  await page.getByLabel('Something you could observe').fill('A name is written in the minutes')
  await page.getByRole('button', { name: 'Save the plan' }).click()
  await sees(page, 'Edit the plan', 'finishing the plan saves it')
  const current = () => page.locator('.flow-steps [aria-current="step"] .flow-steps__label').textContent()
  check((await current()) === 'Try it', 'the flow shows the attempt as the current step', `saw ${await current()}`)

  console.log('\nOptional rehearsal')
  await page.getByText('Rehearse your opening first').click()
  await sees(page, 'Rehearsal — this is not a real conversation', 'the rehearsal is marked as one')
  await page.getByLabel('What you would say').fill('Who here can decide the date?')
  await page.getByRole('button', { name: 'Say it' }).click()
  await sees(page, 'I am not sure I see the issue', 'the scripted counterpart answers')
  await shot(page, 'flow-3-rehearsal')
  check((await current()) === 'Try it', 'rehearsing records nothing and moves nothing on')

  console.log('\nReal attempt and reflection')
  await page.getByLabel('Outcome').selectOption('changed')
  await page.getByLabel('What actually happened').fill('Asked it. Two people named different owners.')
  await page.getByRole('button', { name: 'Record it' }).click()
  await sees(page, 'An attempt is history.', 'the attempt is recorded')
  check((await current()) === 'Reflect', 'the flow moves to reflection')
  await page.getByRole('button', { name: 'Save the reflection' }).click()
  check((await page.locator('#done-heading').count()) === 0, 'an empty reflection is not saved')
  await page.getByLabel('What you observed').fill('Two owners were named, and nobody objected to either.')
  await page.getByLabel(/A competing explanation/).fill('Ownership may really be shared and that may be fine.')
  await shot(page, 'flow-4-reflect')
  await page.getByRole('button', { name: 'Save the reflection' }).click()
  await sees(page, 'Reflection saved', 'saving the reflection is confirmed')
  await sees(page, 'Prepare the next attempt', 'and the next step follows from what was decided')

  console.log('\nSupporting evidence and a chosen memory')
  await page.getByRole('button', { name: 'Attach evidence' }).click()
  await page.getByLabel('What it says').fill('The minutes list both names under “owner”.')
  await page.getByRole('button', { name: 'Attach it' }).click()
  await sees(page, 'The minutes list both names', 'evidence is attached to the activity')
  await page.getByRole('button', { name: 'Hang this on your mobile' }).click()
  await sees(page, 'This is hung on', 'the memory is hung only when asked for')
  await shot(page, 'flow-5-reflection-saved')

  console.log('\nMeaningful return')
  await page.goto(base)
  await page.reload()
  await sees(page, 'Where you left it', 'home returns to the latest reflection')
  await sees(page, 'Two owners were named, and nobody objected to either.', 'in the person’s own words, after a reload')
  const memory = page.locator('.memory-list button')
  check((await memory.count()) === 1, 'the memory is a labelled HTML button, not only a shape')
  await memory.first().focus()
  await page.keyboard.press('Enter')
  await sees(page, '1 piece of supporting evidence attached.', 'opening it from the keyboard shows the record behind it')
  await shot(page, 'flow-6-return-home')
  await page.getByRole('link', { name: 'Open the record' }).click()
  await page.waitForURL(/#\/activity\//)
  await sees(page, 'Supporting evidence', 'and it leads to the record and its evidence')
  await page.goto(`${base}#/repertoire`)
  await sees(page, 'Tried and reflected on', 'the repertoire lists what was practised')
  await shot(page, 'flow-7-repertoire')

  console.log('\nAppearance')
  await page.goto(`${base}#/settings`)
  // The radios reflect what was saved, so they change once the save has landed, not on the click.
  await page.getByText('Cascade', { exact: true }).click()
  await sees(page, 'Saved in this browser.', 'changing the arrangement saves and says so')
  await page.getByText('Moss and ink', { exact: true }).click()
  await page.getByRole('radio', { name: /Moss and ink/, checked: true }).waitFor()
  await page.reload()
  check(await page.getByRole('radio', { name: /Cascade/ }).isChecked(), 'the saved arrangement survives a reload')
  await sees(page, 'on the drop', 'the memory stays on its shape in the new arrangement')
  await shot(page, 'settings-mobile')

  console.log('\nExport, demo separation, import')
  await page.getByRole('button', { name: 'Show the export' }).click()
  const dataHref = await page.getByRole('link', { name: /Download it as/ }).getAttribute('href')
  const exported = decodeURIComponent((dataHref ?? '').replace(/^data:[^,]*,/, ''))
  check(/"compositionId":\s*"cascade"/.test(exported), 'the export carries the mobile')
  check(exported.includes('Who decides the release date'), 'and the records')
  // Change something, then import the export: the whole record set, mobile included, comes back.
  await page.getByText('Hoop', { exact: true }).click()
  await page.getByRole('radio', { name: /Hoop/, checked: true }).waitFor()
  await page.getByLabel('Paste an export to import').fill(exported)
  await page.getByRole('button', { name: 'Check it' }).click()
  await sees(page, 'Ready to import', 'the export validates as an import')
  await page.getByRole('button', { name: 'Replace my records with this file' }).click()
  await page.getByRole('button', { name: 'Yes, replace them' }).click()
  await page.getByRole('radio', { name: /Cascade/, checked: true }).waitFor()
  check(true, 'importing it restores the saved mobile')
  await page.getByLabel('Paste an export to import').fill(exported.replace('"compositionId"', '"compositionId": 7, "x"'))
  await page.getByRole('button', { name: 'Check it' }).click()
  await sees(page, 'This file was not imported', 'a malformed mobile is refused by validation, with nothing changed')
  await page.getByRole('radio', { name: /Fictional demo/ }).check()
  await sees(page, 'You are looking at fictional demo records.', 'the demo is announced as fiction')
  await page.goto(`${base}#/`)
  await page.waitForSelector('h1')
  check((await page.getByText('Who decides the release date').count()) === 0, 'personal records do not appear in the demo')
  check((await page.locator('.memory-list button').count()) === 0, 'the personal memory is not on the demo mobile')
  await page.goto(`${base}#/repertoire`)
  await sees(page, 'By capability', 'the populated demo shows a populated repertoire')
  await page.getByRole('radio', { name: /My records/ }).check()
  await page.goto(`${base}#/`)
  await sees(page, 'Where you left it', 'switching back shows the personal records again')
  check((await page.locator('.memory-list button').count()) === 1, 'with the personal memory intact')

  console.log('\nEvery earlier address still opens')
  for (const hash of ['#/campaign', '#/situations', '#/situations/new', '#/progress', '#/records', '#/content', '#/assemblage', '#/settings', '#/practice', '#/repertoire', '#/prepare']) {
    await page.goto(base + hash)
    await page.waitForSelector('h1')
    const h1 = await page.getByRole('heading', { level: 1 }).count()
    const marked = await page.locator('.app-nav a[aria-current="page"]').count()
    const missing = await page.getByText('That page does not exist').count()
    check(h1 === 1 && marked === 1 && missing === 0, `${hash} opens inside one of the four destinations`)
  }

  console.log('\nKeyboard')
  await page.goto(base)
  await page.keyboard.press('Tab')
  const first = await page.evaluate(() => document.activeElement?.textContent)
  check(first?.includes('Skip to content'), 'the first tab stop is the skip link')
  await page.getByRole('link', { name: 'Practice', exact: true }).focus()
  await page.keyboard.press('Enter')
  await page.waitForURL(/#\/practice/)
  const focused = await page.waitForFunction(() => document.activeElement?.id === 'main', null, { timeout: 3000 }).then(() => true, () => false)
  check(focused, 'navigating moves focus to the main region')
  await context.close()

  console.log('\nNarrow screen, reduced motion')
  const narrow = await browser.newContext({ viewport: { width: 360, height: 700 }, reducedMotion: 'reduce' })
  const small = await narrow.newPage()
  small.on('pageerror', (e) => errors.push(String(e)))
  for (const hash of ['#/', '#/prepare', '#/practice', '#/repertoire', '#/settings']) {
    await small.goto(base + hash)
    await small.waitForSelector('h1')
    const overflow = await small.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    check(overflow <= 0, `${hash} does not scroll sideways at 360px`, `overflows by ${overflow}px`)
  }
  await small.goto(base)
  const tab = small.getByRole('link', { name: 'Repertoire', exact: true })
  const box = await tab.boundingBox()
  check(box !== null && box.height >= 44 && box.y > 500, 'the four destinations are a bottom bar with full-size targets')
  const animated = await small.evaluate(() => getComputedStyle(document.querySelector('.mobile__hang')).animationName)
  check(animated === 'none', 'the mobile is still under reduced motion')
  check((await small.locator('.mobile svg').count()) === 1, 'and still fully drawn')
  await narrow.close()

  check(errors.length === 0, 'the application logged no errors in the browser', errors.slice(0, 3).join(' | '))
} catch (error) {
  console.log(`\nThe checks stopped early: ${error.message}`)
  failures.push('stopped early')
} finally {
  await browser.close()
  server.close()
}

console.log(`\n${passed}/${passed + failures.length} checks passed`)
if (failures.length > 0) {
  console.log('\nFailed checks:')
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
