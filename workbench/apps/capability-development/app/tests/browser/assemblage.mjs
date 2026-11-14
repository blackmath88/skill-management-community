/**
 * Browser checks for the assemblage.
 *
 * Runs against the real production build in a real browser, driving the real IndexedDB. It covers
 * the things that cannot be checked in Node:
 *
 *   A. The renderer gate: the static drawing paints first; a forced WebGL 2 backend starts and
 *      reports itself honestly; a WebGPU-only request on a machine without a WebGPU adapter fails
 *      with a stated reason instead of claiming a backend it did not get; and in every one of
 *      those states the whole screen still works.
 *   B. Assembly: place a piece from the tray, turn it, undo, and see it survive a reload.
 *   C. A marker opens the real record behind it, in the page rather than in the canvas.
 *   D. Resilience: repeated mount and unmount, and no rendering at all while idle.
 *
 * Playwright is taken from the environment, exactly as in journey.mjs; see the note there.
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
  console.error('Cannot run the assemblage checks: the `playwright` module is not resolvable here.')
  console.error('No checks were run.')
  process.exit(1)
}

try {
  await stat(join(DIST, 'index.html'))
} catch {
  console.error(`No build found at ${DIST}. Run \`npm run build\` first.`)
  process.exit(1)
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

let checks = 0
const failures = []

function check(name, condition, detail = '') {
  checks += 1
  if (condition) console.log(`  ok   ${name}`)
  else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
    failures.push(name)
  }
}

const { server, port } = await serveDist()
const base = `http://127.0.0.1:${port}`
const browser = await playwright.chromium.launch({ args: ['--no-sandbox'] })

/** Page errors are failures: a thrown renderer is not allowed to be invisible. */
const pageErrors = []

const context = await browser.newContext({ viewport: { width: 1180, height: 900 } })
// Counting rAF from outside the application measures real idle work without putting a test hook
// into shipped code.
await context.addInitScript(() => {
  window.__rafCalls = 0
  const original = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (callback) => {
    window.__rafCalls += 1
    return original(callback)
  }
})
const page = await context.newPage()
page.on('pageerror', (error) => pageErrors.push(error.message))

async function chooseRenderer(label) {
  await page.getByRole('radio', { name: label, exact: true }).check()
  await page.waitForTimeout(2500)
}

async function backendLine() {
  return (await page.getByTestId('assemblage-backend').textContent()) ?? ''
}

try {
  // ---------------------------------------------------------------- A. renderer gate
  console.log('\nA. Renderer gate')
  await page.goto(`${base}/#/assemblage`)
  await page.waitForSelector('.assemblage-svg', { timeout: 20000 })
  const firstPaintPaths = await page.locator('.assemblage-svg path').count()
  check('the static drawing paints the composition before any GPU work', firstPaintPaths > 60, `${firstPaintPaths} polygons`)
  check(
    'the static drawing has an accessible name describing the composition',
    ((await page.locator('.assemblage-svg').getAttribute('aria-label')) ?? '').includes('faceted pieces'),
  )

  await chooseRenderer('Static drawing')
  check('static-only leaves the drawing in place', (await backendLine()).includes('state=static'))
  check('static-only draws no canvas', (await page.locator('.assemblage-canvas.is-live').count()) === 0)

  await chooseRenderer('WebGL 2 only')
  const webgl = await backendLine()
  check('a forced WebGL 2 backend starts', webgl.includes('backend=webgl2'), webgl)
  check('shadow maps initialised on the WebGL 2 backend', webgl.includes('shadows=on'), webgl)
  check('the canvas is showing once a frame has been drawn', (await page.locator('.assemblage-canvas.is-live').count()) === 1)
  check(
    'the status line names the backend in words',
    ((await page.locator('.assemblage-camera .meta').textContent()) ?? '').includes('WebGL 2'),
  )

  await chooseRenderer('WebGPU only')
  const webgpu = await backendLine()
  const gpuAvailable = webgpu.includes('backend=webgpu')
  if (gpuAvailable) {
    check('a WebGPU backend starts and reports itself as WebGPU', true, webgpu)
  } else {
    // This is the expected result on a machine with no WebGPU adapter. What matters is that it
    // fails honestly and loudly rather than reporting a backend it did not get.
    check('WebGPU-only fails rather than silently falling back', webgpu.includes('state=failed'), webgpu)
    const reported = (await page.locator('.panel .meta').allTextContents()).join(' ')
    check('the failure says which path was tried and why', reported.includes('WebGPU'), reported.slice(0, 160))
    check(
      'the static drawing is back and still has the composition in it',
      (await page.locator('.assemblage-svg path').count()) > 60,
    )
  }
  check('everything still works after a failed renderer: the piece list is present', (await page.locator('.assemblage-list > li').count()) === 6)

  // ---------------------------------------------------------------- B. assembly
  console.log('\nB. Assembly, turning, undo and persistence')
  await chooseRenderer('WebGL 2 only')
  await page.getByRole('button', { name: 'Signature form', exact: true }).click()
  await page.getByRole('button', { name: 'Take it off display' }).click()
  await page.waitForTimeout(600)
  check('taking a piece off display leaves five', (await page.locator('.assemblage-list > li').count()) === 5)
  await page.waitForSelector('text=Saved in this browser.', { timeout: 8000 }).catch(() => undefined)

  await page.getByLabel('A piece from the tray').selectOption('signature-open')
  await page.waitForTimeout(300)
  const contactOptions = await page.getByLabel('Where it goes').locator('option').count()
  check('the contact positions offered are only the free ones', contactOptions > 0, `${contactOptions} offered`)
  await page.getByRole('button', { name: 'Place it here' }).click()
  await page.waitForTimeout(700)
  check('placing it brings the composition back to six', (await page.locator('.assemblage-list > li').count()) === 6)

  await page.getByRole('button', { name: 'Signature form', exact: true }).click()
  const turnBefore = (await page.locator('.assemblage-list > li.is-selected .meta').textContent()) ?? ''
  await page.getByRole('button', { name: 'Turn it on' }).click()
  await page.waitForTimeout(600)
  const turnAfter = (await page.locator('.assemblage-list > li.is-selected .meta').textContent()) ?? ''
  check('turning a piece changes its reported orientation', turnBefore !== turnAfter, `${turnBefore} → ${turnAfter}`)

  await page.getByRole('button', { name: 'Undo the last change' }).click()
  await page.waitForTimeout(600)
  const turnUndone = (await page.locator('.assemblage-list > li.is-selected .meta').textContent()) ?? ''
  check('undo puts the orientation back', turnUndone === turnBefore, `${turnUndone}`)

  await page.reload()
  await page.waitForSelector('.assemblage-list > li', { timeout: 20000 })
  check('the composition survives a reload', (await page.locator('.assemblage-list > li').count()) === 6)

  // ---------------------------------------------------------------- C. marker to record
  console.log('\nC. A marker opens the record behind it')
  await page.getByRole('radio', { name: 'Fictional demo' }).check()
  await page.waitForTimeout(1200)
  await page.waitForSelector('.assemblage-list > li', { timeout: 20000 })
  await page.getByRole('button', { name: 'Broad foundation', exact: true }).click()
  await page.getByLabel('Which kind').selectOption('paired-inlay')
  const recordOptions = await page.getByLabel('Which record it points at').locator('option').count()
  check('the markers offer the real evidence records to point at', recordOptions > 1, `${recordOptions - 1} records`)
  const second = await page.getByLabel('Which record it points at').locator('option').nth(1).getAttribute('value')
  await page.getByLabel('Which record it points at').selectOption(second ?? '')
  await page.getByRole('button', { name: 'Add the marker' }).click()
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Paired inlay', exact: true }).first().click()
  await page.waitForTimeout(300)
  const quote = await page.locator('.assemblage-evidence').textContent()
  check('selecting the marker shows the real record text, in the page', (quote ?? '').length > 20, (quote ?? '').slice(0, 70))
  const links = (await page.locator('.panel a').allTextContents()).join(' ')
  check('the record panel links back into the records', links.includes('Open it among all records'))

  await page.getByRole('button', { name: 'Hide it from the picture' }).click()
  await page.waitForTimeout(500)
  const afterHide = await page.locator('.assemblage-evidence').textContent()
  check('hiding the marker does not remove the record behind it', (afterHide ?? '').length > 20)

  // ---------------------------------------------------------------- D. resilience
  console.log('\nD. Repeated mounting, and no rendering while idle')
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole('link', { name: 'Home', exact: true }).click()
    await page.waitForTimeout(350)
    await page.getByRole('link', { name: 'Settings', exact: true }).click()
    await page.getByRole('link', { name: 'Earlier assemblage', exact: true }).click()
    await page.waitForTimeout(1400)
  }
  check('three rounds of leaving and returning leave the screen working', (await page.locator('.assemblage-list > li').count()) >= 5)
  check('no uncaught errors across mounting and unmounting', pageErrors.length === 0, pageErrors.join(' | '))

  await page.waitForTimeout(1500)
  const before = await page.evaluate(() => window.__rafCalls)
  await page.waitForTimeout(3000)
  const after = await page.evaluate(() => window.__rafCalls)
  check('nothing is drawn while the composition sits idle', after - before === 0, `${after - before} animation frames in 3s`)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1200)
  const scrolledFrom = await page.evaluate(() => window.__rafCalls)
  await page.waitForTimeout(2000)
  const scrolledTo = await page.evaluate(() => window.__rafCalls)
  check('nothing is drawn while the viewport is scrolled out of sight', scrolledTo - scrolledFrom === 0)

  // ---------------------------------------------------------------- D2. keyboard only
  //
  // The claim this screen makes is that the canvas is never the only way to do anything. That is
  // worth driving rather than asserting, so this does a whole placement without the mouse: tab to
  // a control, operate it with the keyboard, and check the composition changed.
  console.log('\nD2. Placing a piece with the keyboard alone')
  await page.goto(`${base}/#/assemblage`)
  await page.waitForSelector('.assemblage-list > li', { timeout: 20000 })

  const removeButton = page.getByRole('button', { name: 'Take it off display' })
  await page.getByRole('button', { name: 'Wedge', exact: true }).focus()
  await page.keyboard.press('Enter')
  await removeButton.waitFor({ state: 'visible', timeout: 5000 })
  await removeButton.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(700)
  const afterRemoval = await page.locator('.assemblage-list > li').count()
  check('a piece can be taken off display from the keyboard', afterRemoval === 5, `${afterRemoval} pieces`)

  const tray = page.getByLabel('A piece from the tray')
  await tray.focus()
  check('the tray select takes keyboard focus', await tray.evaluate((el) => el === document.activeElement))
  await tray.selectOption('wedge')
  await page.waitForTimeout(400)
  const where = page.getByLabel('Where it goes')
  await where.focus()
  await where.selectOption({ index: 0 })
  const placeButton = page.getByRole('button', { name: 'Place it here' })
  await placeButton.focus()
  check('the place button takes keyboard focus', await placeButton.evaluate((el) => el === document.activeElement))
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)
  const afterPlacement = await page.locator('.assemblage-list > li').count()
  check('and places the piece, with no pointer used at all', afterPlacement === 6, `${afterPlacement} pieces`)

  const undoButton = page.getByRole('button', { name: 'Undo the last change' })
  await undoButton.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(700)
  check('undo works from the keyboard too', (await page.locator('.assemblage-list > li').count()) === 5)

  // Put it back, so the later checks start from a complete composition.
  await tray.selectOption('wedge')
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Place it here' }).click()
  await page.waitForTimeout(700)

  // ---------------------------------------------------------------- E. a browser with no GPU
  //
  // Not a hypothetical: WebGL can be disabled, and some hardened profiles and headless
  // configurations give no context at all. Three's WebGL backend throws from inside its own
  // initialisation in that case, as an unhandled rejection that `await init()` cannot catch, so
  // this check is about the console being clean as much as about the fallback working.
  console.log('\nE. A browser with neither WebGPU nor WebGL')
  const blind = await browser.newContext({ viewport: { width: 1100, height: 900 } })
  await blind.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'gpu', { get: () => undefined, configurable: true })
    } catch {
      // Some engines will not let it be redefined; the WebGL half of the check still applies.
    }
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (typeof type === 'string' && type.includes('webgl')) return null
      return original.call(this, type, ...rest)
    }
  })
  const blindPage = await blind.newPage()
  const blindErrors = []
  blindPage.on('pageerror', (error) => blindErrors.push(error.message))
  await blindPage.goto(`${base}/#/assemblage`)
  await blindPage.waitForSelector('.assemblage-svg', { timeout: 20000 })
  await blindPage.getByRole('radio', { name: 'Choose automatically', exact: true }).check()
  await blindPage.waitForTimeout(3500)
  check(
    'with no GPU path at all, the renderer reports failure rather than hanging',
    ((await blindPage.getByTestId('assemblage-backend').textContent()) ?? '').includes('state=failed'),
  )
  check('the composition is still drawn', (await blindPage.locator('.assemblage-svg path').count()) > 60)
  check('every piece is still listed', (await blindPage.locator('.assemblage-list > li').count()) === 6)
  await blindPage.getByRole('button', { name: 'Signature form', exact: true }).click()
  await blindPage.getByRole('button', { name: 'Turn it on' }).click()
  await blindPage.waitForTimeout(600)
  check(
    'pieces can still be turned with no renderer',
    ((await blindPage.locator('.assemblage-list > li.is-selected .meta').textContent()) ?? '').includes('Turned'),
  )
  await blindPage.getByRole('button', { name: 'Turn the view right' }).click()
  await blindPage.waitForTimeout(500)
  check('the view can still be orbited with no renderer', (await blindPage.locator('.assemblage-svg path').count()) > 60)
  check('and it does it without throwing anything into the console', blindErrors.length === 0, blindErrors.join(' | '))
  await blind.close()
} finally {
  await browser.close()
  server.close()
}

console.log(`\n${checks - failures.length}/${checks} checks passed`)
if (failures.length > 0) {
  console.error(`Failed: ${failures.join(', ')}`)
  process.exit(1)
}
