import { chromium, devices } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], hasTouch: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:4173/v5/');
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/v5-start.png' });
// Walk toward the west gap to see the prebuilt barrier + turret.
await page.keyboard.down('a');
await page.keyboard.down('s');
await page.waitForTimeout(1100);
await page.keyboard.up('s');
await page.waitForTimeout(900);
await page.keyboard.up('a');
await page.waitForTimeout(11000);
await page.screenshot({ path: '/tmp/v5-gap.png' });
// Long unattended stretch: barriers should hold while threat ramps.
await page.waitForTimeout(45000);
await page.screenshot({ path: '/tmp/v5-60s.png' });
const energy = await page.textContent('#energy-value');
const hull = await page.$eval('#ship-bar-fill', (el) => el.style.width);
console.log('energy:', energy, 'hull:', hull);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log('ok');
