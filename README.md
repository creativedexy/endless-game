# endless-game

Top down sci-fi builder non stop game 🤟🏻

## Mars Colony

A single-file, hyper-casual 3D **gather-and-build** game built with [Three.js](https://threejs.org/) (loaded via CDN). No build step — just open `index.html` in a modern browser.

### How to play

- **Move** with `WASD` or the arrow keys (touch joystick on mobile).
- **Forage** by simply rolling over resource cubes — they get vacuumed onto a stack on your back.
- **Deposit** by returning to the green Oxygen Dome in the center; your stack drains into the colony bank.
- **Fight** the black sand beetles crawling in from the edges — ram them to pop them and earn rare **Biomass**.

### Resources

| Resource | Color | Source |
|----------|-------|--------|
| Regolith | brown | foraging |
| Resin    | blue  | foraging |
| Biomass  | green | ramming beetles |

### Base expansion

The Oxygen Dome evolves as you bank resources:

| Level | Goal | Visual change |
|-------|------|---------------|
| 1 | — | Small green hemisphere |
| 2 | 20 Regolith | Dome scales 1.5×, metallic grid floor appears |
| 3 | 50 Resin | Dome scales 2×, two survivor colonists spawn inside |
| 4 | 30 Biomass | Dome scales 2.6×, fully terraformed glow |

### Features

- Auto-foraging with a "vacuum" tween (scale + spin into the player).
- A dynamic Y-axis carry stack that wobbles with movement velocity.
- LIFO deposit animation arcing each cube up into the dome beacon.
- Proximity-defense beetles that spawn at the map edge and march inward.
- Camera chase with screen shake on impacts, dune-displaced terrain, and a starfield backdrop.

### Run it

```bash
# any static server works, e.g.
python3 -m http.server 8000
# then open http://localhost:8000
```
