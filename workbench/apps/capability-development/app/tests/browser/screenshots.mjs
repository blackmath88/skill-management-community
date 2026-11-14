/**
 * Review screenshots of the built application.
 *
 *   node tests/browser/screenshots.mjs <out-dir> <label> [route=name ...]
 *
 * Serves ./dist with `vite preview` semantics (a tiny static server), opens each route in the
 * personal (empty) and fictional-demo record sets at a desktop and a narrow width, and writes
 * PNGs named <label>-<route>-<records>-<width>.png. Nothing is asserted here: this is a camera,
 * not a test. Playwright is resolved from the environment, as in journey.mjs.
 */
import { createServer } from 'node:http'
import { mkdir, readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const DIST = resolve(HERE, '../../dist')
const [outDir = 'screenshots', label = 'shot', ...routeArgs] = process.argv.slice(2)
const routes = routeArgs.length
  ? routeArgs.map((a) => a.split('='))
  : [
      ['home', '#/'],
      ['practice', '#/practice'],
      ['repertoire', '#/repertoire'],
      ['settings', '#/settings'],
    ]

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
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
  console.error('Playwright is not resolvable here; no screenshots were taken.')
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
await mkdir(outDir, { recursive: true })

const browser = await playwright.chromium.launch()
for (const [width, height] of [
  [1280, 860],
  [390, 780],
]) {
  for (const records of ['personal', 'demo']) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' })
    await context.addInitScript((ns) => {
      try {
        window.localStorage.setItem('skilling-me-softly:namespace', ns)
      } catch {
        // ignore
      }
    }, records)
    const page = await context.newPage()
    for (const [name, hash] of routes) {
      await page.goto(base + hash)
      await page.waitForSelector('h1')
      await page.waitForTimeout(250)
      await page.screenshot({ path: join(outDir, `${label}-${name}-${records}-${width}.png`), fullPage: true })
    }
    await context.close()
  }
}
await browser.close()
server.close()
console.log(`Screenshots written to ${outDir}`)
