// Browser smoke test of the core loop. Needs the app running (npm run build && npm start)
// and Playwright. Speech is faked so a whole lesson runs in seconds.
//   BASE_URL=http://localhost:3000 OUT=./shots node tests/smoke.cjs
const { chromium } = require('playwright');
const OUT = process.env.OUT || require('os').tmpdir();
const BASE = process.env.BASE_URL || 'http://localhost:3000';
// Fake speech: each utterance "speaks" for 5ms; records what was said.
const fake = () => {
  window.__said = [];
  const voices = [{ name: 'Fake JA', lang: 'ja-JP', localService: true }, { name: 'Fake EN', lang: 'en-US', localService: true }];
  let cur = null, timer = null;
  const synth = {
    getVoices: () => voices,
    speak(u) { cur = u; window.__said.push([u.lang, u.text]); timer = setTimeout(() => { cur = null; u.onend && u.onend(); }, 5); },
    cancel() { clearTimeout(timer); cur = null; },
    addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
};
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(fake);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(BASE);
  await page.waitForSelector('text=Up next');
  await page.screenshot({ path: `${OUT}/1-home.png` });

  // Slow pauses down enough to catch "Your turn" on screen.
  await page.click('text=Start');
  await page.waitForURL('**/lesson/ja-1-01');
  await page.screenshot({ path: `${OUT}/2-player-ready.png` });
  await page.click('button[aria-label="Play"]');
  await page.waitForSelector('text=Your turn: say it out loud', { timeout: 60000 });
  await page.screenshot({ path: `${OUT}/3-your-turn.png` });
  const cueShown = await page.locator('section[aria-live]').innerText();
  console.log('your-turn view:', JSON.stringify(cueShown));
  if (/こんにちは/.test(cueShown)) throw new Error('answer visible during anticipation pause');
  await page.waitForSelector('section[aria-live]:has-text("Repeat")', { timeout: 20000 });
  await page.screenshot({ path: `${OUT}/4-repeat.png` });
  console.log('repeat view:', JSON.stringify(await page.locator('section[aria-live]').innerText()));
  await page.click('button[aria-label="Pause"]');
  const store1 = JSON.parse(await page.evaluate(() => localStorage.getItem('kikitori:v1')));
  console.log('saved position:', store1.lessons['ja-1-01'].position);

  // Resume flow
  await page.goto(BASE);
  await page.waitForSelector('text=Continue');
  const btn = await page.locator('a:has-text("Resume")').innerText();
  console.log('home button:', btn);
  await page.screenshot({ path: `${OUT}/5-home-resume.png` });
  await page.click('a:has-text("Resume")');
  await page.waitForURL('**/lesson/ja-1-01');
  await page.waitForTimeout(300);
  const time = await page.locator('.tabular-nums span').first().innerText();
  console.log('player resumes at:', time);
  if (time === '0:00') throw new Error('did not resume');

  // Speed through the rest: tiny pauses.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('kikitori:v1'));
    s.prefs.pauseScale = 0.002; localStorage.setItem('kikitori:v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.click('button[aria-label="Play"]');
  await page.waitForSelector('text=Lesson 1 complete', { timeout: 60000 });
  await page.screenshot({ path: `${OUT}/6-complete.png` });
  const said = await page.evaluate(() => window.__said.length);
  console.log('utterances spoken in last run:', said);

  await page.click('text=Next: Lesson 2');
  await page.waitForURL('**/lesson/ja-1-02');
  await page.goto(BASE);
  await page.waitForSelector('text=Up next');
  const card = await page.locator('section[aria-labelledby="up-next"] h2').innerText();
  console.log('next up:', card);
  await page.screenshot({ path: `${OUT}/7-home-after.png`, fullPage: true });

  await page.goto(BASE + '/settings');
  await page.waitForSelector('text=Speaking speed');
  await page.screenshot({ path: `${OUT}/8-settings.png` });

  // No Japanese voice -> banner
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx2.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [{ name: 'EN', lang: 'en-US' }], addEventListener() {}, removeEventListener() {}, cancel() {}, speak() {} } });
  });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE);
  await p2.waitForSelector('text=No Japanese voice on this device.');
  console.log('no-ja-voice banner: shown');

  console.log('console errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
