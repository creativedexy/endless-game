// Quick headless smoke test: loads the built game, simulates play,
// fails on any console/page errors, and saves screenshots.
import { chromium, devices } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:4173/';
const errors = [];

async function run(name, contextOpts, actions) {
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

// Desktop: move with WASD, press space/shift, let the game run a while.
await run('desktop', { viewport: { width: 1280, height: 720 } }, async (page) => {
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

if (errors.length) {
  console.error('SMOKE TEST FAILED:');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log('Smoke test passed — no console or page errors.');
