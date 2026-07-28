# endless-game

Top down sci-fi builder non stop game 🤟🏻

## Wormline Defense

A single-file, portrait **tower-defense roguelite** with a bioluminescent-abyss art direction, where the enemy is one giant segmented worm — simultaneously the threat, the run timer, the loot container and the positioning puzzle. Pure HTML/CSS/JS canvas, no dependencies, one-handed mobile play.

**Play it live:** https://creativedexy.github.io/endless-game/wormline-defense/

- **One continuous worm, always** — every worm is a single unbroken body for its entire life; nothing ever fractures into multiple worms. Instead, the body itself gets more dangerous the deeper you fight into it: every segment further from the head is measurably tougher than the last, so stalling partway through a worm is a losing bet. A wide zig-zag/serpentine/spiral route (a different pattern generator each stage) swings edge-to-edge across the full screen width, so you're constantly repositioning to keep up.
- **Drag to aim, shoot straight** — there's no auto-targeting. Your organism fires on its own timer, but every shot travels straight up from wherever your turret currently sits; you drag left/right (or press ←/→) to slide underneath whatever you want to hit. A readout above the turret shows what's locked in your lane. Only segments actually visible on screen can be damaged — nothing can be sniped while it's still off-screen above the route.
- **Rare capsules that punish hesitation** — sealed mutation capsules are deliberately scarce now (roughly one per 9–13 segments). Crack one to 50% to reveal its reward category and it starts *ripening*: every second it survives un-destroyed feeds the worm carrying it +1.5% speed (capped per capsule, stacking across several), visibly glowing hotter the longer it's ignored — so "I'll get it later" is a real, compounding cost, not a suggestion. Each of the nine reward pools has its own hand-drawn icon glyph. Trap capsules permanently harden the worm and chip the core on trigger instead of spawning anything.
- **Head or body?** — the core decision: burn down the tanky head to collapse the whole worm fast (but forfeit most energy and every unopened capsule), or carve through the body for power. Anything that reaches the breach deals damage per surviving segment (scaled up further by any capsules you let ripen), so even partial kills matter.
- **Six weapons, three abilities, evolutions** — Pulse Needle, Cleanse Orb, Antibody Drones, Ion Arc, Enzyme Cloud and Compression Wave, joined by Spore Wing (an airborne striker), Husk Roller (a wide sweeping crusher) and Cinder Gland (spreading fire); a short, separate pool of practical Boosts (multishot, damage%, fire rate, crit, pierce, healing) rounds out the build. Max a weapon and crack an evolution capsule to transform it (Needle Constellation, Storm Lattice, Seismic Collapse…). Everything drafted mid-run persists for the rest of that run and is lost only when the run itself ends.
- **Worm roster & bosses** — runners, armoured worms, regenerators, a Hive Worm that hardens itself further with every segment you kill, phase worms, an Ironclad Worm that fuses and hardens at the halfway mark, plus multi-phase segmented bosses (The Crowned Devourer's head detaches at 25% health, absorbs the rest of its own body, and makes a tougher, faster run for the breach).
- **Roguelite structure, sharply harder** — 3-card upgrade drafts with one free reroll per stage, steep stage-over-stage HP/speed/density scaling, a Cryo Stasis active ability, and permanent biomass upgrades (damage, fire rate, crit, core HP, capsule luck) between runs.

Source: `wormline-defense/index.html` (single file, no build step, saves to localStorage).

## AGI Race — "The Singularity Times"

A single-file, Plague Inc.–style **AGI strategy sim** with a distinctive **broadsheet** look: white newsprint, black monospace type, ASCII bars, a scrolling ticker and a blinking caret. You run an AI lab racing to *aligned* AGI before a rival gets there first. No dependencies, no build step, mobile-friendly.

**Play it live:** https://creativedexy.github.io/endless-game/agi-race/

- **★ BUILD tab** — buy and level tangible assets: 🖥️ Datacenters (Compute + AGI speed), 🧪 Scientists (research), 🛠️ Engineers (Capital + product), ⚡ Power Plants (datacenter capacity), 🛡️ Safety Researchers (Alignment).
- **Versioned model releases** — train to fill the Next-Model bar, then RELEASE as Flagship / Efficient / Open-weights (v1 → v2 → v3…). A living **AI ‘brain’** in the centre morphs and grows as you add datacenters, scientists and versions.
- **Open-source economy** — a relentless free *Open-Weights line* rises every month; keep releasing or your product lead — and revenue — collapses.
- **Policy trees & dilemmas** — Compute / Space / Bio / Econ / Gov give mid-game depth; major events pause the game and force a choice.
- **Rivals map to real labs** — OpenMind (OpenAI), DeepThought (DeepMind), XenoAI (xAI), DeepHorizon (DeepSeek), Llamaworks (open-weights / Meta) — racing you *and* a rogue-actor doom clock.
- **Guided & forgiving** — always-visible goal, a contextual coach, tap-a-meter explanations, paused start.
- **Endings** — aligned singularity, techno-hegemony, gentle transition; vs. collapse, lost mandate, misaligned ignition, insolvency, or being outpaced.

Source: `agi-race/index.html` (pure HTML/CSS/JS canvas-free, no dependencies).

## AGI Race — Evening Edition (the short cut)

The same race, stripped to the bone: **one decision at a time, sixteen decisions, about two minutes.** No tabs, no shop, no numbers on screen.

**Play it live:** https://creativedexy.github.io/endless-game/agi-race-lite/

- **One card, two answers** — a headline and two buttons. Hover or hold either one to see which meters it moves, shown as arrows rather than figures.
- **Three meters and a race** — MONEY, PUBLIC, CONTROL. Empty any of them and you're finished. A single track shows you closing on the singularity from the left while everyone else closes from the right.
- **Control erodes as capability grows** — the smarter it gets, the harder it is to hold. Reach the singularity with control gone and you win the wrong ending.
- **The creature is the build tree** — your choices quietly accumulate into one of six forms (SAGE, ROGUE, SWARM, TITAN, WARDEN, ORGANISM), which decides your ending. No UI, full replayability.
- **Eleven endings**, each a title and one line. A deck of 32 cards deals ~16 per run, so no two games repeat.

Source: `agi-race-lite/index.html`. Sprite sheets are shared with the full edition; the game logic is ~21 KB.

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
