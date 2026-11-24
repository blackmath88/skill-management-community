/* global window, HTMLCanvasElement, innerWidth, document */
// Start `npm run preview` first. Override ASSEMBLAGE_URL / CHROMIUM_PATH when needed.
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(
  process.env.NODE_PATH ? resolve(process.env.NODE_PATH, 'playwright') : 'playwright',
)
const output = process.env.SCREENSHOT_DIR || 'test-results/assemblage'
const base = process.env.ASSEMBLAGE_URL || 'http://127.0.0.1:4173/'

import { writeFile, mkdir } from 'node:fs/promises'
await mkdir(output, { recursive: true })
const records = []
for (const scenario of ['webgpu', 'webgl', 'static', 'no-gpu', 'no-graphics', 'module-failure']) {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: [
      '--no-sandbox',
      '--enable-unsafe-swiftshader',
      ...(scenario === 'webgpu'
        ? [
            '--enable-unsafe-webgpu',
            '--use-angle=swiftshader',
            '--enable-features=Vulkan',
            '--use-vulkan=swiftshader',
          ]
        : []),
    ],
  })
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const started = Date.now()
  if (['no-gpu', 'no-graphics'].includes(scenario))
    await page.addInitScript((mode) => {
      Object.defineProperty(navigator, 'gpu', { get: () => undefined })
      if (mode === 'no-graphics') {
        const original = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (type.includes('webgl')) return null
          return original.call(this, type, ...args)
        }
      }
    }, scenario)
  if (scenario === 'module-failure') await page.route('**/assets/renderer-*.js', (r) => r.abort())
  if (scenario === 'webgpu')
    await page.addInitScript(() => {
      const request = navigator.gpu.requestAdapter.bind(navigator.gpu)
      navigator.gpu.requestAdapter = async (...args) => {
        const adapter = await request(...args)
        if (adapter) {
          const create = adapter.requestDevice.bind(adapter)
          adapter.requestDevice = async (...a) => {
            const device = await create(...a)
            window.testDevice = device
            return device
          }
        }
        return adapter
      }
    })
  await page.goto(base + '?renderer=' + (['webgl', 'static'].includes(scenario) ? scenario : 'auto'))
  await page.locator('.assemblage').waitFor()
  if (['webgpu', 'webgl', 'no-gpu'].includes(scenario))
    await page.locator('canvas').waitFor({ timeout: 25000 })
  else if (scenario !== 'static') await page.getByText(/graphics could not/).waitFor({ timeout: 25000 })
  await page.waitForTimeout(1500)
  const init = Date.now() - started
  const status = await page.locator('.assemblage-backend').textContent()
  const expected = ['no-graphics', 'module-failure', 'static'].includes(scenario)
    ? 'Static view'
    : scenario === 'webgpu'
      ? 'WebGPU'
      : 'WebGL 2'
  assert.ok(status.startsWith(expected), `${scenario}: ${status}`)
  const canvas = page.locator('canvas')
  const first = (await canvas.count()) ? await canvas.getAttribute('data-submissions') : null
  await page.waitForTimeout(600)
  const second = (await canvas.count()) ? await canvas.getAttribute('data-submissions') : null
  await page.locator('.assemblage').screenshot({ path: `${output}/final-${scenario}.png` })
  assert.equal(first, second, `${scenario} should stop submitting frames when idle`)
  const record = {
    scenario,
    status,
    browser: browser.version(),
    pageReadyMs: init,
    rendererInitializationMs: (await canvas.count())
      ? await canvas.getAttribute('data-initialization-ms')
      : null,
    idle: [first, second],
    errors,
  }
  if (scenario === 'webgpu') {
    record.adapter = await page.evaluate(async () => {
      const a = await navigator.gpu.requestAdapter()
      return {
        vendor: a?.info.vendor,
        architecture: a?.info.architecture,
        device: a?.info.device,
        description: a?.info.description,
      }
    })
    await page.evaluate(() => window.testDevice?.destroy())
    await page.getByText(/graphics unavailable/).waitFor()
    record.deviceLoss = await page.locator('.assemblage-backend').textContent()
  }
  if (scenario === 'webgl') {
    record.webgl = await canvas.evaluate((c) => {
      const gl = c.getContext('webgl2')
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      return {
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : '',
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '',
      }
    })
    const box = await canvas.boundingBox()
    await canvas.click({ position: { x: box.width * 0.4, y: box.height * 0.52 } })
    await page.getByRole('heading', { name: 'Standing stone', exact: true }).waitFor()
    record.pointerSelection = true
    await page.getByRole('button', { name: /Standing stone/ }).click()
    await page.getByRole('button', { name: /Rotate piece/ }).click()
    await page.waitForTimeout(650)
    record.settledSubmissions = await canvas.getAttribute('data-submissions')
    await page.waitForTimeout(600)
    record.afterSettled = await canvas.getAttribute('data-submissions')
    record.lastCpuSubmissionMs = await canvas.getAttribute('data-submission-ms')
    await canvas.evaluate((c) => c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext())
    await page.getByText(/graphics unavailable/).waitFor()
    record.contextLoss = await page.locator('.assemblage-backend').textContent()
  }
  if (scenario === 'static') {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('.assemblage').screenshot({ path: `${output}/final-mobile-static.png` })
    record.mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  }
  assert.deepEqual(errors, [])
  records.push(record)
  console.log(JSON.stringify(record))
  await page.goto('about:blank')
  await page.waitForTimeout(200)
  await browser.close()
}
await writeFile(`${output}/renderer-checks.json`, JSON.stringify(records, null, 2))
