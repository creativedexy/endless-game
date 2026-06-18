# endless-game

Top down sci-fi builder non stop game 🤟🏻

## Mars Colony: War Front

A single-file 3D **base-builder war game** built with [Three.js](https://threejs.org/) (loaded via CDN). No build step — open `index.html` in a modern browser.

**Play it live:** https://creativedexy.github.io/endless-game/mars-colony/

You're the **commander** of a frontier outpost. You win by **building** — but supply doesn't come free. Drive **out into the field** to harvest crystals, haul the supply back, and spend it on barracks, turrets, and upgrades while your army holds a single front line against waves from the north. Leave the base to gather and you can't plug breaches yourself, so time your runs.

### How to play

- **Move** your commander with `WASD` / arrows (touch joystick on mobile).
- **Earn supply by harvesting**: drive out to the **crystal fields** and saber them — each cluster banks supply. Nodes near the front are richer but riskier; flank/rear nodes are a safer, longer drive.
- **Stand on a build pad** to fund it from your supply bank.
- **Barracks** deploy soldiers up to a cap (raise it by upgrading the barracks). They march north and hold the **front line** — a single wall of posts.
- **Turrets**, **med tents**, **armory**, and **reinforce** back the line up. Enemies that break a post pour through the **breach** toward your **HQ core**. If the core's HP hits 0 → game over.
- Your **saber swings automatically** — it's both your harvesting tool and an emergency blade for plugging breaches. Fixed size; no saber upgrades.

### The core loop

Harvest crystals in the field → haul supply back → build/upgrade (barracks, turrets, med tents, armory, reinforce) → hold the line → survive escalating waves → repeat.

### Build pads (walk-on, funded from supply)

**Five** big build plots sit on an arc around the south side of your HQ. Each rebuilds at the next tier when completed.

| Pad | Effect |
|-----|--------|
| **Barracks** | One upgradeable garrison — each tier raises the troop cap (8 → 24) and speeds deployment |
| **Turret** | Auto-cannon stationed on the front line (repeatable) |
| **Med Tent** | Heal aura that mends nearby soldiers (repeatable) |
| **Armory** | +50% soldier damage & HP per tier |
| **Reinforce** | +wall & HQ HP and a full repair of both |

### Soldiers & the front line

- **Soldiers** spawn from the barracks up to its tier cap (no flooding), march to the nearest enemy, and fire from range. With no enemies near, they form up along the hold line.
- The **front line** is one readable wall of posts spanning the north edge of your base — no rings, no bastions, no inner court. Damage a post and it tints red; destroy it and enemies stream through the gap.
- **Enemies** advance from the north and **shoot back**: **grunts** (default riflemen), faster **runners** that rush into short range (wave 2+), and heavy **tanks** that outrange your soldiers and shrug off fire (wave 4+). They trade fire with soldiers in the way, batter the wall up close, then make for the core. A lone soldier line beats basic grunts but bleeds against tanks — back it with turrets, med tents, and armory upgrades.

### Waves

A countdown HUD shows the next wave's ETA (it flashes red in the final seconds). Each wave ramps spawn rate, enemy HP, and enemy variety; higher waves drop focused packs from the same bearing.

### Features

- **Active harvest economy** — supply comes from sabering crystal fields out beyond the base, so you weigh gather runs against staying home to defend.
- **Friendly army** — barracks deploy soldiers that march, hold, fire, take casualties, and heal at med tents.
- **Single front line** — one damageable wall of posts; breaches open real holes enemies exploit.
- **Auto-firing turrets** on the line, scanning for the nearest enemy and tracing it down.
- **Directional waves** — three enemy types advancing from the north with an INCOMING countdown; they return fire with visible tracers.
- **Emergency-hero saber** — fixed-size auto-swinging blade for plugging breaches and clearing resource crystals.
- **Dressed battlefield** — horizon mesas, scattered rocks, a scorched no-man's-land with craters, and front-line sandbag berms & tank traps.
- **Real game over** with restart, plus dune terrain, fog, starfield, procedural audio, pooled particles, and a chase camera.

### Run it

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
