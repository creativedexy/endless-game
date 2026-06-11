// Quick headless smoke test: loads the built games, simulates play,
// fails on any console/page errors, and saves screenshots.
import { chromium, devices } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4173/';
const errors = [];

async function run(name, url, contextOpts, actions) {
  const browser = await chromium.launch();
  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${name}] console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[${name}] pageerror: ${err.message}`));
  await page.goto(url);
  await page.waitForTimeout(1500);
  await actions(page);
  await page.screenshot({ path: `screenshot-${name}.png` });
  await browser.close();
}

// ----------------------------------------------------------------- V1

// Desktop: move with WASD, press space/shift, let the game run a while.
await run('desktop', base, { viewport: { width: 1280, height: 720 } }, async (page) => {
  await page.keyboard.down('w');
  await page.waitForTimeout(900);
  await page.keyboard.up('w');
  await page.keyboard.down('d');
  await page.keyboard.press('Shift');
  await page.waitForTimeout(700);
  await page.keyboard.up('d');
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
  }
  // Let enemies spawn and turrets/combat tick for a bit.
  await page.waitForTimeout(6000);
});

// Mobile landscape: tap the action button, drag the joystick.
await run(
  'mobile',
  base,
  { ...devices['iPhone 13 landscape'], hasTouch: true },
  async (page) => {
    const size = page.viewportSize();
    // Drag joystick on the left half.
    await page.touchscreen.tap(size.width * 0.2, size.height * 0.6);
    await page.waitForTimeout(300);
    // Tap action button bottom-right.
    await page.touchscreen.tap(size.width - 70, size.height - 74);
    await page.waitForTimeout(2500);
  },
);

// ----------------------------------------------------------------- V2

const v2 = new URL('v2/', base).href;

// Desktop: run around, dash, hold fire, then walk to a pad and build (key 1).
await run('v2-desktop', v2, { viewport: { width: 1280, height: 720 } }, async (page) => {
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  await page.keyboard.down('s');
  await page.keyboard.press('Shift');
  await page.waitForTimeout(900);
  await page.keyboard.up('s');
  await page.keyboard.down('Space');
  await page.waitForTimeout(1500);
  await page.keyboard.up('Space');
  // Try the build menu hotkeys wherever we ended up.
  await page.keyboard.press('Digit1');
  await page.waitForTimeout(300);
  // Let enemies spawn and the wreck burn for a bit.
  await page.waitForTimeout(6000);
});

// Mobile portrait (the V2 default): drag the joystick, tap DASH.
await run(
  'v2-mobile',
  v2,
  { ...devices['iPhone 13'], hasTouch: true },
  async (page) => {
    const size = page.viewportSize();
    // Touch the joystick zone bottom-left.
    await page.touchscreen.tap(size.width * 0.22, size.height * 0.82);
    await page.waitForTimeout(300);
    // Tap the DASH button bottom-right (shooting is automatic).
    await page.touchscreen.tap(size.width - 78, size.height - 94);
    await page.waitForTimeout(2500);
  },
);

// ----------------------------------------------------------------- V3

const v3 = new URL('v3/', base).href;

// Desktop: run toward the ridge, dash, let combat and gap-funnelling tick.
await run('v3-desktop', v3, { viewport: { width: 1280, height: 720 } }, async (page) => {
  await page.keyboard.down('w');
  await page.waitForTimeout(900);
  await page.keyboard.up('w');
  await page.keyboard.down('d');
  await page.keyboard.press('Shift');
  await page.waitForTimeout(900);
  await page.keyboard.up('d');
  await page.waitForTimeout(7000);
});

// Mobile portrait: joystick + dash tap.
await run(
  'v3-mobile',
  v3,
  { ...devices['iPhone 13'], hasTouch: true },
  async (page) => {
    const size = page.viewportSize();
    await page.touchscreen.tap(size.width * 0.22, size.height * 0.82);
    await page.waitForTimeout(300);
    await page.touchscreen.tap(size.width - 78, size.height - 94);
    await page.waitForTimeout(2500);
  },
);

if (errors.length) {
  console.error('SMOKE TEST FAILED:');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log('Smoke test passed — no console or page errors.');
