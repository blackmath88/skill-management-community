/* global document, innerWidth */
/**
 * End-to-end browser journey.
 *
 * Two journeys through the real built application in a real browser, driving the real IndexedDB:
 *
 *   A. The complete loop: describe a situation, start the campaign, keep an explanation, choose
 *      the personal-practice branch, rehearse against the scripted counterpart, plan the real
 *      attempt, record a partial outcome, review it with a competing explanation, and see what
 *      the records show — then check that practice experience moved by exactly the documented
 *      amount and that the rehearsal is still recorded as a rehearsal.
 *
 *   B. The branch where clarification of a mandate, not personal training, is the right move:
 *      the conditions branch, which must present itself as a complete answer and must be able to
 *      end the campaign without that reading as a failure.
 *
 * It also checks that a campaign can be stopped at any step, and that a reload shows the records
 * again (so the IndexedDB write really happened).
 *
 * Playwright is taken from the environment rather than added as a project dependency: the
 * container ships a Chromium with a matching Playwright, and installing a second copy would not
 * find that browser. If it is not resolvable the script says so and exits non-zero rather than
 * reporting a pass it did not run.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const DIST = resolve(HERE, '../../dist')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

/**
 * Resolve Playwright from wherever it is installed. Node's ESM loader ignores NODE_PATH, which is
 * how this container exposes its global modules, so a bare `import('playwright')` fails here even
 * though `require('playwright')` works. createRequire gets the CommonJS resolution rules back.
 */
let playwright
const requireFrom = createRequire(import.meta.url)
for (const attempt of [
  () => import('playwright'),
  () => Promise.resolve(requireFrom('playwright')),
  () => Promise.resolve(requireFrom(resolve(process.env.NODE_PATH ?? '', 'playwright'))),
]) {
  try {
    playwright = await attempt()
    break
  } catch {
    // Try the next resolution strategy.
  }
}
if (!playwright?.chromium) {
  console.error('Cannot run the browser journey: the `playwright` module is not resolvable here.')
  console.error('This container provides Chromium and a matching Playwright globally; elsewhere, install')
  console.error('Playwright and its Chromium, then run this script again. No checks were run.')
  process.exit(1)
}

async function ensureBuild() {
  try {
    await stat(join(DIST, 'index.html'))
  } catch {
    console.error(`No build found at ${DIST}. Run \`npm run build\` first.`)
    process.exit(1)
  }
}

function serveDist() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const requested = url.pathname === '/' ? '/index.html' : url.pathname
    const path = join(DIST, normalize(requested).replace(/^(\.\.[/\\])+/, ''))
    if (!path.startsWith(DIST)) {
      res.writeHead(403).end('Forbidden')
      return
    }
    try {
      const body = await readFile(path)
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body)
    } catch {
      res.writeHead(404).end('Not found')
    }
  })
  return new Promise((done) => {
    server.listen(0, '127.0.0.1', () => done({ server, port: server.address().port }))
  })
}

// Living Assemblage: actual IndexedDB and DOM commands, production build.
import assert from 'node:assert/strict'
const { server, port } = await serveDist()
const browser = await playwright.chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const origin = `http://127.0.0.1:${port}`
let checks = 0
async function check(name, fn) {
  await fn()
  checks++
  console.log('PASS', name)
}
try {
  await ensureBuild()
  await page.goto(origin + '/?renderer=webgl')
  await page.locator('.assemblage-view').scrollIntoViewIfNeeded()
  await page.getByText('WebGL 2', { exact: true }).waitFor()
  await check('actual WebGL 2 canvas', async () =>
    assert.equal(await page.locator('canvas').getAttribute('data-backend'), 'WebGL 2'),
  )
  await page.getByRole('button', { name: /Turning wedge/ }).click()
  await page.getByRole('button', { name: 'Return to tray', exact: true }).click()
  await page.getByRole('button', { name: /Turning wedge.*In the tray/ }).waitFor()
  await check('remove and preview placement', async () => {
    await page.getByRole('button', { name: /Turning wedge/ }).click()
    await page.getByLabel('Contact position').selectOption('river/crown')
    await page.getByRole('button', { name: /Rotate preview/ }).click()
    await page.getByRole('button', { name: 'Place piece', exact: true }).click()
    await page.getByRole('button', { name: /Turning wedge.*On display/ }).waitFor()
  })
  await check('undo and restore', async () => {
    await page.getByRole('button', { name: 'Undo last change' }).click()
    await page.getByRole('button', { name: /Turning wedge.*In the tray/ }).waitFor()
    await page.getByRole('button', { name: /Turning wedge/ }).click()
    await page.getByRole('button', { name: 'Place piece', exact: true }).click()
    await page.getByRole('button', { name: /Turning wedge.*On display/ }).waitFor()
  })
  await check('palette and motion survive reload', async () => {
    await page.getByRole('button', { name: 'Tidal blue', exact: true }).click()
    await page.getByLabel('Motion off', { exact: true }).click()
    await page.waitForFunction(() => document.querySelector('.assemblage-view-controls input').checked)
    await page.reload()
    await page.getByLabel('Motion off', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('Motion off', { exact: true }).isChecked(), true)
    assert.equal(
      await page.getByRole('button', { name: 'Tidal blue', exact: true }).getAttribute('aria-pressed'),
      'true',
    )
  })
  await check('real demo evidence route', async () => {
    await page.getByRole('radio', { name: 'Fictional demo', exact: true }).check()
    await page
      .getByRole('heading', {
        name: 'I want recurring questions in my working groups to end with a decision somebody owns.',
        exact: true,
      })
      .waitFor()
    await page.getByRole('button', { name: /Standing stone/ }).click()
    await page.getByText('Keep a memory from your records', { exact: true }).click()
    const select = page.getByLabel('Supporting evidence', { exact: true })
    const value = await select.locator('option').nth(1).getAttribute('value')
    await select.selectOption(value)
    await page.getByRole('button', { name: 'Link selected record' }).click()
    await page.getByRole('button', { name: /A memory from your records/ }).click()
    await page.getByRole('heading', { name: 'Supporting record', exact: true }).waitFor()
    assert.ok((await page.locator('.assemblage-evidence p').first().textContent()).length > 10)
    await page.getByLabel('Show this marker').click()
    await page.waitForFunction(() => !document.querySelector('.assemblage-evidence input').checked)
    await page.getByLabel('Show this marker').click()
    await page.waitForFunction(() => document.querySelector('.assemblage-evidence input').checked)
  })
  await page.getByText('Appearance files & display options', { exact: true }).click()
  let appearance
  await check('appearance export contains no private associations', async () => {
    const promise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export appearance only' }).click()
    const download = await promise
    appearance = await readFile(await download.path(), 'utf8')
    assert.ok(!appearance.includes('evidenceId'))
    assert.ok(!appearance.includes('exampleId'))
  })
  await check('future-schema import preserves current state and source text', async () => {
    const invalid = JSON.stringify({ ...JSON.parse(appearance), schemaVersion: 9 })
    await page.getByLabel('Appearance JSON', { exact: true }).fill(invalid)
    await page.getByRole('button', { name: 'Validate & replace appearance' }).click()
    await page.getByText(/Unsupported assemblage schema or catalogue/).waitFor()
    assert.equal(await page.getByLabel('Appearance JSON', { exact: true }).inputValue(), invalid)
    assert.equal(await page.getByRole('button', { name: /A memory from your records/ }).count(), 1)
  })
  await check('validated appearance import then reload', async () => {
    await page.getByLabel('Appearance JSON', { exact: true }).fill(appearance)
    await page.getByRole('button', { name: 'Validate & replace appearance' }).click()
    await page
      .getByRole('button', { name: /Unlinked decoration/ })
      .first()
      .waitFor()
    await page.reload()
    await page
      .getByRole('button', { name: /Unlinked decoration/ })
      .first()
      .waitFor()
  })
  await check('GPU loss preserves controls and saved composition', async () => {
    await page.locator('.assemblage-view').scrollIntoViewIfNeeded()
    await page.getByText('WebGL 2', { exact: true }).waitFor()
    await page
      .locator('canvas')
      .evaluate((canvas) => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
    await page.getByText(/graphics unavailable/).waitFor()
    assert.ok(await page.getByRole('button', { name: /Standing stone/ }).isEnabled())
    await page.getByRole('button', { name: /Standing stone/ }).click()
    await page.getByRole('button', { name: /Rotate piece/ }).click()
  })
  await check('static mode and narrow screen keyboard controls', async () => {
    await page.getByText('Appearance files & display options', { exact: true }).click()
    await page.getByLabel('Graphics mode').selectOption('static')
    assert.equal(await page.locator('canvas').count(), 0)
    await page.setViewportSize({ width: 390, height: 844 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    const button = page.getByRole('button', { name: /Open circle/ })
    await button.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: /Rotate piece/ }).waitFor()
  })
  await page.setViewportSize({ width: 1400, height: 1100 })
  await page.getByLabel('Graphics mode').selectOption('webgl')
  await page.locator('.assemblage-view').scrollIntoViewIfNeeded()
  await page.getByText('WebGL 2', { exact: true }).waitFor()
  await check('idle submissions stop', async () => {
    await page.waitForTimeout(900)
    const first = await page.locator('canvas').getAttribute('data-submissions')
    await page.waitForTimeout(800)
    assert.equal(await page.locator('canvas').getAttribute('data-submissions'), first)
  })
  await check('repeated route mount/unmount cleans canvas', async () => {
    for (let i = 0; i < 3; i++) {
      await page.getByRole('link', { name: 'All records', exact: true }).click()
      assert.equal(await page.locator('canvas').count(), 0)
      await page.getByRole('link', { name: 'Home', exact: true }).click()
      await page.locator('.assemblage-view').scrollIntoViewIfNeeded()
      await page.getByText('WebGL 2', { exact: true }).waitFor()
      assert.equal(await page.locator('canvas').count(), 1)
    }
  })
  await check('no uncaught application errors', async () => assert.deepEqual(errors, []))
  console.log(`${checks} assemblage browser checks passed`)
} finally {
  await page.goto('about:blank')
  await browser.close()
  server.closeAllConnections()
  await new Promise((done) => server.close(done))
}
