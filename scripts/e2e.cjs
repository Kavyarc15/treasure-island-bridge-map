// Optional end-to-end check in a real browser (Playwright). Not part of `npm test`.
// Usage:  npm run build && node scripts/e2e.cjs
// Needs the `playwright` package (Chromium) to be resolvable.
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const url = 'file://' + path.resolve(__dirname, '..', 'dist', 'index.html');
const shots = path.resolve(__dirname, '..', 'docs', 'screenshots');
fs.mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(url);

  const stage = () => page.$eval('#stage', (el) => el.innerHTML);
  const text = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim());
  const shot = (name) => page.screenshot({ path: path.join(shots, name), fullPage: true });
  const step = async (n) => { for (let i = 0; i < n; i++) await page.click('#btn-step'); };
  const attrs = (sel, attr) => page.$$eval(sel, (els, a) => els.map((e) => e.getAttribute(a)).sort(), attr);

  // 0. nothing loaded yet
  await shot('01-empty.png');
  assert.equal(await page.isDisabled('#btn-step'), true);
  assert.equal(await page.isDisabled('#btn-reset'), true);

  // 1. Load My Archipelago (default option = main demo) in ONE click
  await page.click('#btn-load');
  const afterLoad = await stage();
  assert.match(await text('#progress-text'), /Event 0 of 62/);
  assert.equal((await attrs('#map .bridge', 'data-edge')).length, 10);
  assert.equal((await attrs('#map .island', 'data-node')).length, 9);
  await shot('02-loaded-pre-traversal.png');

  // 2. step through, capturing key moments
  await step(12); // shows events[11]
  assert.match(await text('.event .headline'), /Harbour Market \(HARBOR\) is an articulation island/);
  await shot('03-step-12-articulation-harbor.png');
  await step(9); // events[20]: REEF sees ANCHOR (back connection)
  assert.match(await text('.event .proof'), /low\[REEF\] = min\(4, discovery\[ANCHOR\] = 0\) = 0/);
  await shot('04-step-21-back-connection.png');
  await step(17); // events[37]: WAVE sees SHELL
  assert.match(await text('.event .proof'), /low\[WAVE\] = min\(8, discovery\[SHELL\] = 5\) = 5/);
  await step(7); // events[44]: BR07 equality -> not a bridge
  assert.match(await text('.event .proof'), /low\[TIDE\] = 5 ≤ discovery\[SHELL\] = 5/);
  await shot('05-step-45-strict-inequality.png');
  await step(1); // events[45]: SHELL articulation by >=
  assert.match(await text('.event .proof'), /low\[TIDE\] = 5 ≥ discovery\[SHELL\] = 5/);
  await shot('06-step-46-nonstrict-articulation.png');

  // 3. finish stepping one by one
  await step(62 - 46);
  assert.equal(await page.isDisabled('#btn-step'), true);
  const steppedFinal = await stage();

  // 4. Reset restores the pre-traversal state EXACTLY
  await page.click('#btn-reset');
  assert.equal(await stage(), afterLoad, 'Reset must restore the loaded state exactly');
  assert.match(await text('#progress-text'), /Event 0 of 62/);

  // 5. Run to End gives exactly the same screen as stepping all the way
  await page.click('#btn-run');
  const runFinal = await stage();
  assert.equal(runFinal, steppedFinal, 'Step x62 and Run to End must end in the same state');
  await shot('07-final-run-to-end.png');

  // 6. final results visible together and correct
  assert.deepEqual(await attrs('#map .bridge.b-bridge', 'data-edge'), ['BR01', 'BR02', 'BR06', 'BR10']);
  assert.deepEqual(await attrs('#map .island.n-art', 'data-node'), ['ANCHOR', 'HARBOR', 'REEF', 'SHELL', 'TIDE']);
  assert.match(await text('.summary h2'), /Final safety summary/);
  assert.match(await text('.summary .comp'), /^1 component/);
  const rows = await page.$$eval('table.nodes tbody tr', (trs) =>
    trs.map((tr) => [...tr.children].slice(0, 4).map((c) => c.textContent.trim())),
  );
  assert.deepEqual(rows, [
    ['ANCHOR', 'null (root)', '0', '0'], ['HARBOR', 'ANCHOR', '1', '1'], ['KELP', 'HARBOR', '2', '2'],
    ['MANGO', 'ANCHOR', '3', '0'], ['PEARL', 'TIDE', '7', '7'], ['REEF', 'MANGO', '4', '0'],
    ['SHELL', 'REEF', '5', '5'], ['TIDE', 'SHELL', '6', '5'], ['WAVE', 'TIDE', '8', '5'],
  ]);
  assert.equal(await page.$$eval('#history-list li', (l) => l.length), 62);

  // 7. Reset again, then a repeat run is identical
  await page.click('#btn-reset');
  assert.equal(await stage(), afterLoad);
  await step(62);
  assert.equal(await stage(), runFinal, 'repeat stepped run must be identical');

  // 8. other samples
  await page.selectOption('#sample', 'cycle');
  await page.click('#btn-load');
  await page.click('#btn-run');
  assert.deepEqual(await attrs('#map .bridge.b-bridge', 'data-edge'), []);
  assert.deepEqual(await attrs('#map .island.n-art', 'data-node'), []);
  assert.match(await text('.summary'), /None: every bridge has an alternate route/);
  await shot('08-cycle-only-final.png');

  await page.selectOption('#sample', 'combo');
  await page.click('#btn-load');
  await page.click('#btn-run');
  assert.match(await text('.summary .comp'), /^3 components/);
  assert.deepEqual(await attrs('#map .island.n-art', 'data-node'), ['ATOLL']);
  assert.deepEqual(await attrs('#map .bridge.b-bridge', 'data-edge'), ['S1', 'S2']);
  // every island centre must lie inside the visible map (no clipping)
  const centres = await page.$$eval('#map .island', (els) =>
    els.map((e) => (e.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/) || []).slice(1).map(Number)));
  for (const [x, y] of centres) assert.ok(x > 40 && x < 780 && y > 40 && y < 460, `island at ${x},${y} is clipped`);
  await shot('09-root-disconnected-isolated-final.png');

  // 9. invalid input clears stale replay and results
  await page.selectOption('#sample', 'main');
  await page.click('#btn-load');
  await step(25);
  await page.selectOption('#sample', 'bad-coord');
  await page.click('#btn-load');
  assert.equal(await page.$('.map'), null, 'no stale map');
  assert.equal(await page.$('table.nodes'), null, 'no stale table');
  assert.equal(await page.$('.summary'), null, 'no stale summary');
  assert.equal(await page.$('.history'), null, 'no stale history');
  assert.match(await text('.errors'), /COORDINATE_OUT_OF_RANGE.*"B".*x=140/);
  assert.equal(await page.isDisabled('#btn-step'), true);
  assert.equal(await page.isDisabled('#btn-run'), true);
  assert.equal(await page.isDisabled('#btn-reset'), true);
  await shot('10-invalid-coordinate.png');

  for (const key of ['bad-dup-node', 'bad-endpoint', 'bad-loop', 'bad-dup-edge']) {
    await page.selectOption('#sample', key);
    await page.click('#btn-load');
    assert.ok(await page.$('.errors'), key);
    assert.equal(await page.$('.map'), null, key);
  }

  // 10. valid load after invalid
  await page.selectOption('#sample', 'main');
  await page.click('#btn-load');
  assert.equal(await stage(), afterLoad);

  assert.deepEqual(errors, [], 'no browser errors');
  await browser.close();
  console.log('E2E PASSED');
})().catch((e) => { console.error(e); process.exit(1); });
