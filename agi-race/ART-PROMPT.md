# Bitmap Creature Art Brief — "The Singularity Times" AI creatures

Use this brief in an image-generation session to produce drop-in pixel-art sprites
for the AGI Race game. The game currently draws a *procedural* canvas creature; these
sprites will replace it. Everything below is specified so the frames can be wired back
in with zero guesswork. **Read the "What I need back" section at the end first — that is
the contact sheet you must return.**

---

## The look

Tiny **bitmap creatures** — chunky, readable pixel art, like a Game Boy / PICO-8 era
monster. They live inside a **broadsheet newspaper** UI ("The Singularity Times"):
cream newsprint, black ink, halftone dots. So the creatures must read as **ink-on-paper
woodcut-meets-pixel**, not glossy modern game art.

**Palette (match the game exactly):**
- Paper / background the sprite sits on: `#f4f1e9` (cream) — but **export on transparent background**.
- Ink / primary outline: `#16140d` (near-black).
- Newsprint mid-grey: `#8f897a`.
- Each archetype has ONE signature accent colour (below). Keep palettes tight: **ink +
  paper + 2–3 shades of the accent**. No gradients, no anti-aliasing — hard pixel edges,
  optional 1-px dithering for shading (newsprint halftone feel).

**Pixel spec:**
- Each creature drawn on a **64×64 logical pixel grid**, exported at **4× = 256×256 px**
  per frame (nearest-neighbour, no smoothing).
- Bold 1–2 px ink outline around the whole silhouette so it pops on cream.
- Front-facing, centred, feet/anchor at a consistent baseline so frames don't jitter.
- Transparent (alpha) background, PNG.

---

## The 6 archetypes (form is chosen by how the player builds)

Each is a *different creature species*. The game picks which one to show from the player's
choices, so all six must feel like the same "genre" but be instantly distinguishable by
**silhouette and accent colour**.

| key | NAME | accent | personality / visual direction |
|------|----------|-----------|--------------------------------|
| `sage` | **SAGE** | `#147054` deep green | Serene, **transparent** mind that answers to its makers. Calm monk-like orb-creature; visible "inner light", smooth symmetric body, gentle eyes. Trustworthy, open. |
| `rogue` | **ROGUE** | `#b21d12` red | Wilful, **opaque** intelligence straining against every leash. Jagged, asymmetric, spiky; broken chains/cracks; one glaring eye; looks like it's pulling against restraints. |
| `swarm` | **SWARM** | `#925400` amber/brown | A **many-bodied** open intelligence copied across the world. Not one creature — a cluster of small identical units orbiting a core; hive/lattice feel. |
| `titan` | **TITAN** | `#2c2c34` graphite | A sleek **corporate colossus** tuned to the bottom line. Blocky, armoured, monolithic, brand-clean; angular plating; cold efficient eyes. |
| `warden` | **WARDEN** | `#54368c` violet | An **all-seeing** instrument of order and control. Surveillance-tower body, multiple watching eyes, radiating scan-lines, panopticon. |
| `organism` | **ORGANISM** | `#1c6f37` living green | A **living thing entwined with human biology**. Organic, cellular, vine/tendril limbs, soft pulsing membranes, almost botanical/biotech. |

---

## The 6 growth stages (creature grows with AGI %)

Every archetype is drawn at **6 life stages**. The creature should visibly **mature** —
bigger, more limbs, more detail, more eyes/satellites, more presence — from a tiny seed
to a reality-bending entity. Keep the species identity constant across its row.

| # | stage name | AGI range | size / complexity |
|---|------------|-----------|-------------------|
| 1 | `embryo` | 0–19 | tiny, simple blob/seed/single unit. Minimal features. ~40% of frame. |
| 2 | `hatchling` | 20–39 | small, first limbs/eye, recognisable as the species. |
| 3 | `juvenile` | 40–59 | mid-size, more limbs, clearer archetype traits. |
| 4 | `adolescent` | 60–79 | large, confident, multiple limbs/eyes, fills most of frame. |
| 5 | `ascendant` | 80–99 | huge, radiant/imposing, satellites or aura, near-overflowing the frame. |
| 6 | `SINGULARITY` | 100 | transcendent final form — glowing halo/burst, maximum detail, reality-warping. |

That's **6 archetypes × 6 stages = 36 base poses.**

---

## Animation frames I need (this is the contact sheet to return)

The game animates the creature with a few **states**. For each of the 36 base poses I need
a short looping cycle so it breathes/moves on the page. Minimum viable set per pose:

**Per pose (×36):**
1. **`idle`** — 2 frames (breathing / gentle pulse loop). *Required.*
2. **`active`** — 2 frames (faster pulse — used while the player is training a model). *Required.*

**Per archetype, ONE shared overlay set (does not need every stage):**
3. **`danger`** — 2 frames at the `adolescent` stage only, showing the creature
   **reddened, cracked and jittering** (the game tints toward red `#b21d12` and shakes when
   alignment is low / the rogue clock is high). Gives me a reference for the distressed look.
4. **`ascend`** — 2 frames at the `SINGULARITY` stage only, the halo/burst pulsing.

So the deliverable is: **36 poses × (2 idle + 2 active) = 144 frames**, plus **6 danger +
6 ascend = 12 special frames = 156 frames total.** If that's too many for one pass, the
**must-have minimum** is the 36 idle-frame-1 poses (one frozen frame per archetype×stage) —
the game can fall back to a static sprite per state. Idle 2-frame loops are the next priority.

### Contact-sheet layout to hand back

Lay it out as **one PNG contact sheet per archetype** (6 sheets), each a clean grid so I can
slice it programmatically:

```
Rows  = 6 growth stages   (embryo → SINGULARITY, top to bottom)
Cols  = 4 animation frames (idle-1, idle-2, active-1, active-2, left to right)
Cell  = 256×256 px, transparent, no padding/gutter between cells
Sheet = 1024 wide × 1536 tall  (4 cols × 6 rows)
```

Plus, append the special states below each archetype's sheet OR as a 7th small strip:
`danger-1, danger-2, ascend-1, ascend-2` (4 cells, 1024×256).

**Naming** (so frames drop straight into the game): name each sliced file
`creature_<archetype>_<stage>_<state><frame>.png`, e.g.
`creature_rogue_adolescent_idle1.png`, `creature_sage_singularity_ascend2.png`.
Stage keys: `embryo, hatchling, juvenile, adolescent, ascendant, singularity`.
State keys: `idle1, idle2, active1, active2, danger1, danger2, ascend1, ascend2`.

Also return a single **`creatures_index.json`** mapping every archetype→stage→state→filename,
so the game can preload by key without parsing filenames.

---

## Style guardrails (so it matches the game)

- **Ink-on-cream pixel woodcut.** Imagine a 1900s newspaper engraving redrawn at 64×64.
- Hard edges, limited palette, optional ordered-dither shading (halftone). **No** soft
  glows except the SINGULARITY halo, **no** photographic detail, **no** 3D shading ramps.
- Consistent light source and baseline across all frames in a row so animation doesn't jump.
- Each species must be **silhouette-readable** at 32 px (it renders small on mobile).
- Keep the accent colour dominant per species; never mix two species' accents.

## One-paragraph prompt you can paste into an image tool

> Chunky 64×64 pixel-art bitmap creature, bold near-black ink outline (#16140d) on a fully
> transparent background, limited palette of ink + 2–3 shades of {ACCENT} + newsprint grey
> (#8f897a), hard pixel edges with subtle ordered-dither halftone shading, 1900s newspaper
> woodcut redrawn as a Game-Boy-era monster, front-facing and centred on a fixed baseline.
> Subject: {ARCHETYPE DESCRIPTION}, shown at its {STAGE} life-stage ({size/complexity}).
> No anti-aliasing, no gradients, no background — clean sprite for slicing into a contact sheet.

Fill `{ACCENT}`, `{ARCHETYPE DESCRIPTION}`, `{STAGE}`, `{size/complexity}` from the tables
above and run it once per cell (or once per row and animate by hand).
