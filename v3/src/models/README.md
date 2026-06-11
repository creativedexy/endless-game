# V3 low-poly models

Drop `.glb` files in this folder and rebuild — they are bundled
automatically and swapped in at runtime (the game falls back to
procedural placeholder geometry for any file that is missing).

Expected files:

| File | Used for | Notes |
|---|---|---|
| `crashed_ship.glb` | the wreck at the centre | ~14 m long, Y-up, origin at ground centre. Optional empties `fire_01`..`fire_03` mark fire emitter points. |
| `drone_archer.glb` | archer companion drones | ~0.6 m, optional `muzzle` empty. (Hook-up pending — needs node names verified.) |
| `factory.glb` | drone factory building | ≤2.5 m footprint. (Hook-up pending.) |
| `decor_pack.glb` | rocks / spires / crates / pod | separate named meshes `rock_a`.. (Hook-up pending.) |

Style: flat-shaded, no textures, palette — hull `#8d99ad`, dark metal
`#4a5263`, cyan glow `#37e6ff` (emissive), orange `#ff7a26` (emissive),
snow `#dfe9f5`.
