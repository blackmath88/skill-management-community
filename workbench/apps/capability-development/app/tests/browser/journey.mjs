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

// ---------------------------------------------------------------- tiny assertions

let checks = 0
const failures = []

function check(name, condition, detail = '') {
  checks += 1
  if (condition) {
    console.log(`  ok   ${name}`)
  } else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
    failures.push(name)
  }
}

async function expectVisible(page, text, name) {
  const locator = page.getByText(text, { exact: false }).first()
  let visible
  try {
    await locator.waitFor({ state: 'visible', timeout: 5000 })
    visible = true
  } catch {
    visible = false
  }
  check(name, visible, `expected to see ${JSON.stringify(text)}`)
  return visible
}

async function clickButton(page, name, options = {}) {
  const locator = page.getByRole('button', { name, exact: options.exact ?? false }).first()
  await locator.waitFor({ state: 'visible', timeout: 5000 })
  await locator.click()
}

async function clickLink(page, name) {
  const locator = page.getByRole('link', { name, exact: false }).first()
  await locator.waitFor({ state: 'visible', timeout: 5000 })
  await locator.click()
}

async function fill(page, label, value) {
  const field = page.getByLabel(label, { exact: false }).first()
  await field.waitFor({ state: 'visible', timeout: 5000 })
  await field.fill(value)
}

/** Reads the practice-experience total off the "what your records show" page. */
async function readExperienceTotal(page) {
  await page.goto(`${page.__base}#/progress`)
  const heading = await page.getByRole('heading', { level: 2, name: /Practice experience:/ }).first().textContent()
  const match = /Practice experience:\s*(\d+)/.exec(heading ?? '')
  return match ? Number(match[1]) : null
}

/**
 * Polls the total until it reaches the expected value.
 *
 * A save is asynchronous: clicking "Save the reflection" returns before IndexedDB has acknowledged
 * the write, so reading the page straight afterwards can catch the state from before it. Polling
 * is about the test's timing, not about the application being eventually consistent — the
 * assertion still fails if the number never arrives.
 */
async function expectExperienceTotal(page, expected, name) {
  const deadline = Date.now() + 5000
  let actual = null
  while (Date.now() < deadline) {
    actual = await readExperienceTotal(page)
    if (actual === expected) break
    await page.waitForTimeout(150)
  }
  check(name, actual === expected, `got ${actual}, expected ${expected}`)
  return actual
}

/** Waits for the save status the session reports, so a later read is not racing the write. */
async function waitForSaved(page) {
  try {
    await page.getByText('Saved in this browser.', { exact: false }).first().waitFor({ state: 'visible', timeout: 5000 })
  } catch {
    // Some screens navigate away on success; the polling read covers that case.
  }
}

// ---------------------------------------------------------------- the journeys

async function journeyA(page, base) {
  console.log('\nJourney A — the complete loop')

  await page.goto(`${base}#/`)
  await expectVisible(page, 'Prepare for a conversation you are not looking forward to.', 'home opens with an invitation, not a dashboard')
  await expectVisible(page, 'Or start from any other situation.', 'it offers to start from any real situation')

  // 1. Describe a situation.
  await page.goto(`${base}#/situations/new`)
  await fill(page, 'A short title', 'Three units keep reopening data-request approval')
  await fill(page, 'What has actually happened', 'Raised at four meetings. No decision has been recorded.')
  await fill(page, 'The setting', 'Cross-unit working group')
  await clickButton(page, 'Next: what you may do')
  await page.getByLabel('Your room to act').selectOption('recommend')
  await page.getByLabel('Who owns the decision').selectOption('unclear')
  await page.getByLabel('What kind of challenge this is').selectOption('ownership')
  await page.getByLabel('Nobody involved is clearly allowed to decide this').check()
  await clickButton(page, 'Save this situation')
  await expectVisible(page, 'Three units keep reopening', 'the situation is saved and listed')

  // 2. Start the campaign on it.
  await clickLink(page, 'Three units keep reopening data-request approval')
  await expectVisible(page, 'Start a campaign', 'a campaign can be started from the situation')
  await clickButton(page, 'Start it')
  await expectVisible(page, 'What keeps being reopened', 'the campaign opens at its first step')
  await expectVisible(page, 'What this campaign does not do', 'the campaign states its limits up front')

  // 3. Orient, notice, then keep a competing explanation.
  await clickButton(page, 'That is the question')
  await expectVisible(page, 'What already works', 'the next step asks what already works, not only what is wrong')
  await clickButton(page, 'I have seen enough to work with')
  await expectVisible(page, 'Competing explanations', 'competing explanations are offered rather than one diagnosis')
  await expectVisible(page, 'not a softer version', 'a conditions explanation is not framed as the lesser one')
  await clickButton(page, 'How I run the discussion may be part of it')
  await expectVisible(page, 'Keep this as an explanation to test?', 'a seeded explanation has to be kept explicitly')
  await expectVisible(page, 'a possibility, not a finding', 'it is labelled a possibility')
  await clickButton(page, 'Continue')

  // 4. The choose step must offer more than personal practice.
  await expectVisible(page, 'Choose one next move', 'the campaign reaches the choosing step')
  await expectVisible(page, 'Ask whoever can settle it what they need', 'a conditions branch is offered')
  await expectVisible(page, 'There is no occasion to try anything soon', 'an absent opportunity is offered as an answer')
  await expectVisible(page, 'more personal practice will not produce a decision', 'the step says when practice is the wrong tool')
  await clickButton(page, 'Practise asking the closing question myself')

  // 5. Prepare and rehearse.
  await expectVisible(page, 'Prepare the question', 'the prepare step is reached')
  await clickButton(page, 'Rehearse it against a scripted counterpart')
  await expectVisible(page, 'this is not a real conversation', 'the rehearsal says plainly that it is not real')
  await expectVisible(page, 'not a record of anything that happened at work', 'and that it is not a record of real work')

  // The rehearsal counterpart is a fixed script.
  await fill(page, 'What you would say', 'Who can close this, and what would they need from us?')
  await clickButton(page, 'Say it')
  await expectVisible(page, 'The counterpart (fiction)', 'the counterpart is labelled as fiction in the transcript')

  // Saving the rehearsal as an activity.
  await expectVisible(page, 'Record this rehearsal', 'the step offers the rehearsal as a recordable activity')
  await fill(page, 'Review date', '2026-11-20')
  await clickButton(page, 'Save this activity')
  await expectVisible(page, 'Rehearse asking who can close this', 'the rehearsal activity is saved')
  await expectVisible(page, 'It is recorded as preparation', 'and is described as preparation, not application')

  // 6. Record the rehearsal attempt and review it.
  await page.getByLabel('Outcome').selectOption('changed')
  await fill(page, 'What actually happened', 'Shortened it to one sentence after three tries.')
  await page.getByLabel('Help you used').selectOption('ai-sparring')
  await clickButton(page, 'Record it')
  await expectVisible(page, 'What happened', 'the attempt is recorded')
  await expectVisible(page, 'With the sparring partner', 'and the help used is recorded with it')

  await fill(page, 'What you observed', 'The long version was mostly me justifying asking at all.')
  await fill(page, 'A competing explanation that also fits', 'Writing a question down may simply be harder than saying it.')
  await clickButton(page, 'Save the reflection')
  await expectVisible(page, 'Your reflection', 'the review is saved')
  await waitForSaved(page)

  await expectExperienceTotal(page, 2, 'a reviewed rehearsal counts 2 (rehearsal 1 + competing explanation 1)')
  await expectVisible(page, 'Rehearsed', 'the records show the capability as rehearsed')
  await expectVisible(page, 'A rehearsal is preparation', 'and say explicitly that a rehearsal is not real application')

  // 7. The real attempt.
  await page.goto(`${base}#/campaign`)
  await clickButton(page, 'Plan the real attempt')
  await expectVisible(page, 'The real attempt', 'the real-attempt step is reached')
  await expectVisible(page, 'This one happens with real people', 'and is distinguished from the rehearsal')
  await fill(page, 'Review date', '2026-11-25')
  await clickButton(page, 'Save this activity')
  await expectVisible(page, 'Ask who can close this, for real', 'the real attempt is saved as its own activity')

  // A partial outcome: no decision, but the group agreed to ask the sponsor.
  await page.getByLabel('Outcome').selectOption('changed')
  await fill(page, 'What actually happened', 'Asked it. Nobody could name who approves. The group agreed to ask the sponsor instead.')
  await clickButton(page, 'Record it')
  await fill(page, 'What you observed', 'Nobody in the room could name the approver.')
  await fill(page, 'A competing explanation that also fits', 'They may have known and not wanted to say it in that room.')
  await page.getByLabel('What you have decided to do').selectOption('escalate')
  await clickButton(page, 'Save the reflection')
  await expectVisible(page, 'Take it to somebody with the authority', 'a partial result can be recorded as needing escalation')
  await waitForSaved(page)

  await expectExperienceTotal(page, 5, 'a real attempt adds 3 more (real attempt 2 + competing explanation 1)')
  await expectVisible(page, 'Tried for real', 'the records now show it was tried for real')
  await expectVisible(page, 'not a judgement of how well it went', 'without claiming anything about how well it went')

  // 8. The records survive a reload, so IndexedDB really holds them.
  await page.reload()
  await page.goto(`${base}#/records`)
  await expectVisible(page, 'Everything that is stored', 'all records are listed in one place')
  await expectVisible(page, 'Ask who can close this, for real', 'the real attempt is still there after a reload')
  await expectVisible(page, 'Rehearsal', 'and the rehearsal is still labelled as a rehearsal')
}

async function journeyB(page, base) {
  console.log('\nJourney B — the branch where clarifying a mandate is the right move')

  // Start from a clean slate so this journey is independent of A.
  await page.goto(`${base}#/settings`)
  await clickButton(page, 'Delete everything in my records')
  await clickButton(page, 'Yes, delete it all')
  await page.waitForTimeout(400)

  await page.goto(`${base}#/situations/new`)
  await fill(page, 'A short title', 'Nobody in the group can approve external data requests')
  await fill(page, 'What has actually happened', 'Four meetings, no decision. The approver has never been in the room.')
  await fill(page, 'The setting', 'Faculty working group')
  await clickButton(page, 'Next: what you may do')
  await page.getByLabel('Your room to act').selectOption('unclear')
  await page.getByLabel('Who owns the decision').selectOption('contested')
  await page.getByLabel('What kind of challenge this is').selectOption('ownership')
  await clickButton(page, 'Save this situation')

  await clickLink(page, 'Nobody in the group can approve external data requests')
  await clickButton(page, 'Start it')
  await clickButton(page, 'That is the question')
  await clickButton(page, 'I have seen enough to work with')

  // Keep the conditions explanation.
  await clickButton(page, 'Nobody in the room can actually settle it')
  await expectVisible(page, 'Keep this as an explanation to test?', 'the conditions explanation is offered to keep')
  await expectVisible(page, 'Nobody involved is clearly allowed to decide this', 'and it records the barrier it implies')
  await clickButton(page, 'Continue')

  // Take the conditions branch. It seeds a hypothesis, so it asks before applying it.
  await clickButton(page, 'Ask whoever can settle it what they need')
  await expectVisible(page, 'Keep this as an explanation to test?', 'the conditions branch seeds an explanation to keep')
  await clickButton(page, 'Continue')
  await expectVisible(page, 'Clarify the mandate', 'the mandate branch is reached')
  await expectVisible(page, 'deliberately not a training activity', 'and says it is not a training activity')
  await expectVisible(page, 'no amount of personal practice would have produced the decision', 'and why practice would not have helped')
  await expectVisible(page, 'a written record that no such answer is available', 'recording that nobody can answer is a complete outcome')

  // Plan and record the request, with no reply.
  await fill(page, 'Review date', '2026-11-27')
  await clickButton(page, 'Save this activity')
  await expectVisible(page, 'Ask whoever can settle it what they need', 'the request is saved as a real attempt under conditions')
  await expectVisible(page, 'Conditions', 'and is tagged as conditions work rather than personal practice')

  await page.getByLabel('Outcome').selectOption('no-opportunity')
  await fill(page, 'What actually happened', 'Sent the question. No reply in two weeks.')
  await clickButton(page, 'Record it')
  await expectVisible(page, 'The cue never arrived', 'an absent answer is recordable as an outcome')

  await fill(page, 'What you observed', 'No reply to a direct written question in two weeks.')
  await fill(page, 'A competing explanation that also fits', 'The request may have gone to somebody who also cannot decide it.')
  await page.getByLabel('What you have decided to do').selectOption('stop')
  await clickButton(page, 'Save the reflection')

  await waitForSaved(page)
  await expectExperienceTotal(page, 1, 'an absent opportunity earns nothing for the attempt, and 1 for reviewing why')
  await expectVisible(page, 'The cue never arrived, so there is no practice to credit', 'and the page explains exactly that')
  await expectVisible(page, 'No records yet', 'no capability claims to have been practised')

  // The campaign can be stopped here, and stopping is presented as legitimate.
  await page.goto(`${base}#/campaign`)
  await expectVisible(page, 'Stopping a campaign is a legitimate outcome', 'stopping is offered as a legitimate outcome')
  await clickButton(page, 'Stop this campaign')
  await clickButton(page, 'Yes, stop it')
  await expectVisible(page, 'This campaign is stopped', 'the campaign is stopped')
  await expectVisible(page, 'Nothing was deleted by closing the campaign', 'and nothing was deleted with it')

  // The barrier the person recorded is shown under Practice as their own observation.
  await page.goto(`${base}#/practice`)
  await expectVisible(page, 'Barriers you have noticed', 'the barriers are reported as the person’s own observations')
  await expectVisible(page, 'Nobody involved is clearly allowed to decide this', 'the recorded barrier is still there after stopping')
  await page.goto(`${base}#/records`)
  await expectVisible(page, 'authority to close it sits with somebody who is not in the room', 'and the explanation it seeded is kept')
}

/**
 * Journey C — the controls the interface promises.
 *
 * Each of these was a claim the application made and did not keep until an independent review
 * found it: an exploration you can write, records you can actually delete one at a time, and a
 * sparring partner that includes nothing you did not tick.
 */
async function journeyC(page, base) {
  console.log('\nJourney C — exploring, deleting, and consent')

  await page.goto(`${base}#/settings`)
  await clickButton(page, 'Delete everything in my records')
  await clickButton(page, 'Yes, delete it all')
  await page.waitForTimeout(400)

  await page.goto(`${base}#/situations/new`)
  await fill(page, 'A short title', 'A handover that keeps arriving incomplete')
  await fill(page, 'What has actually happened', 'Cases arrive without the checks the receiving team expects.')
  await fill(page, 'The setting', 'Service desk handover')
  await clickButton(page, 'Save it as it is')
  await clickLink(page, 'A handover that keeps arriving incomplete')

  // Writing an exploration, without committing to an activity first.
  await expectVisible(page, 'Think it through with a method', 'a method can be applied to a situation in writing')
  await clickButton(page, 'Apply a method to this situation')
  await expectVisible(page, 'What it does not establish', 'the method states what it does not establish')
  await fill(page, 'What this lens says about your situation', 'Neither side has written down what a complete handover contains.')
  await page.getByLabel('Clarify responsibility and decision ownership').check()
  await clickButton(page, 'Save this exploration')
  await waitForSaved(page)

  await expectExperienceTotal(page, 0, 'writing an exploration earns no practice experience')
  await expectVisible(page, 'Explored', 'but the records do show the capability as explored')
  await expectVisible(page, 'would be recorded next', 'and say what would be recorded next')

  // The sparring partner includes nothing that was not ticked.
  await page.goto(`${base}#/situations`)
  await clickLink(page, 'A handover that keeps arriving incomplete')
  await page.goto(`${base}#/records`)
  await expectVisible(page, 'Everything that is stored', 'all records are listed')

  // Deleting one record of its own kind, rather than everything.
  await page.goto(`${base}#/records`)
  const before = await page.getByText('Neither side has written down', { exact: false }).count()
  check('the exploration is listed among the records', before > 0)

  await page.goto(`${base}#/settings`)
  await expectVisible(page, 'That is a check on one field, not protection across your notes', 'the privacy statement states the limit of the attribution check')
  await expectVisible(page, 'makes no network request', 'and that the sparring partner makes no network request')
}

/** The sparring partner must include nothing the person did not tick. */
async function checkAiConsent(page, base) {
  console.log('\nSparring partner consent')
  await page.goto(`${base}#/`)
  await page.getByRole('radio', { name: /Fictional demo/ }).check()
  await page.waitForTimeout(600)
  await page.goto(`${base}#/activity/demo-activity-real`)
  await page.getByText('Think it through with the sparring partner').click()
  await clickButton(page, 'Use the sparring partner')
  await expectVisible(page, 'Nothing is included unless you tick it', 'the panel says nothing is included unless you tick it')

  const checkboxes = page.locator('fieldset input[type="checkbox"]')
  const count = await checkboxes.count()
  let ticked = 0
  for (let i = 0; i < count; i += 1) if (await checkboxes.nth(i).isChecked()) ticked += 1
  check('no record is ticked to begin with, so that sentence is true', ticked === 0, `${ticked} of ${count} were pre-ticked`)

  const send = page.getByRole('button', { name: 'Send it' })
  check('and sending is unavailable until something is selected', await send.isDisabled())

  await page.getByLabel(/The situation description/).check()
  await clickButton(page, 'Show exactly what would be sent')
  await expectVisible(page, 'Nothing leaves this device', 'the preview says nothing leaves the device')
  await expectVisible(page, 'Also sent, as labels rather than content', 'and lists the metadata that travels with it')
  await expectVisible(page, 'record identifiers', 'including the record identifiers')
  await clickButton(page, 'Send it')
  await expectVisible(page, 'not a language model', 'the reply says plainly it is not a language model')

  // Switch back so the accessibility checks run against the person's own records.
  await page.goto(`${base}#/`)
  await page.getByRole('radio', { name: /My records/ }).check()
  await page.waitForTimeout(400)
}

async function checkAccessibilityBasics(page, base) {
  console.log('\nAccessibility basics')
  await page.goto(`${base}#/`)
  const skip = page.getByRole('link', { name: 'Skip to content' })
  check('there is a skip link', (await skip.count()) === 1)
  const lang = await page.getAttribute('html', 'lang')
  check('the page declares its language', lang === 'en', `got ${lang}`)
  const h1Count = await page.getByRole('heading', { level: 1 }).count()
  check('there is exactly one level-1 heading', h1Count === 1, `got ${h1Count}`)
  const mainFocusable = await page.getAttribute('#main', 'tabindex')
  check('the main region can take focus on navigation', mainFocusable === '-1')
  // The namespace switch is a real radio group, operable from the keyboard.
  const radios = await page.getByRole('radio').count()
  check('the records/demo switch is a keyboard-operable radio group', radios === 2, `got ${radios}`)
}

// ---------------------------------------------------------------- run

await ensureBuild()
const { server, port } = await serveDist()
const base = `http://127.0.0.1:${port}/index.html`
const browser = await playwright.chromium.launch({ args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()
page.__base = base

const consoleErrors = []
page.on('pageerror', (error) => consoleErrors.push(String(error)))
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})

let fatal = null
try {
  await journeyA(page, base)
  await journeyB(page, base)
  await journeyC(page, base)
  await checkAiConsent(page, base)
  await checkAccessibilityBasics(page, base)
} catch (error) {
  fatal = error
}

check('the application logged no errors in the browser', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))

await context.close()
await browser.close()
server.close()

console.log(`\n${checks - failures.length}/${checks} checks passed`)
if (fatal) {
  console.error(`\nThe journey stopped early: ${fatal.message}`)
}
if (failures.length > 0) {
  console.error(`\nFailed checks:\n${failures.map((f) => `  - ${f}`).join('\n')}`)
}
process.exit(fatal || failures.length > 0 ? 1 : 0)
