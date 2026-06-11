import { chromium, devices } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], hasTouch: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:4173/v4/');
// Let it run: enemies cross the wilds, hit the gaps, maybe reach the ship.
await page.waitForTimeout(40000);
await page.screenshot({ path: '/tmp/v4-40s.png' });
const energy = await page.textContent('#energy-value');
const hull = await page.$eval('#ship-bar-fill', (el) => el.style.width);
console.log('energy:', energy, 'hull width:', hull);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log('ok');
