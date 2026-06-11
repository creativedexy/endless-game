import { chromium, devices } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], hasTouch: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:4173/v5/');
await page.waitForTimeout(2000);
// Confirm starting resources and single fence per gap.
console.log('energy:', await page.textContent('#energy-value'),
            'salvage:', await page.textContent('#salvage-value'));
await page.waitForTimeout(50000); // run into threat 2 with combat
await page.screenshot({ path: '/tmp/v5b-50s.png' });
console.log('hull:', await page.$eval('#ship-bar-fill', (el) => el.style.width),
            'threat:', await page.textContent('#threat-value'));
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log('ok');
