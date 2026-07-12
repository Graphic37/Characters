# MEADOWFALL assets

Every external asset the game loads, in the exact directory layout the code expects.

## How to use

1. Create a GitHub repo (e.g. `Graphic37/meadowfall-assets`)
2. Upload the CONTENTS of this zip to the repo ROOT (keep folder names exactly,
   including spaces — GitHub handles them fine)
3. Tell Claude the repo name — repointing the game is a 2-constant change:
   - Characters/KayKit base  -> your new repo raw URL
   - Meadow base             -> your new repo raw URL

## What's inside

- `KayKit_Adventurers_2.0_EXTRA/` — 8 playable adventurer GLBs
- `The Complete KayKit Collection v6/`
  - `KayKit Character Animations 1.1/` — Rig_Medium + Rig_Large animation GLBs
    (movement, combat, tools — Chopping/Pickaxing/Fishing/Hammering/Sawing/Digging)
  - `KayKit Skeletons 1.1/` — skeleton race GLBs
  - `KayKit Mystery Monthly Series 6/` — 13 playable characters + Forgotten
  - `KayKit RPG Tools Bits 1.0/` — axe, pickaxe, rod, hammer, saw, anvil, grindstone, etc.
  - `KayKit Fantasy Weapons Bits 1.0/` — the full melee drop table models
- `Meadow_Source_Files/`
  - `FBX/` — all 181 Synty Meadow models (trees, rocks, props, buildings)
  - `Textures/` — the color atlas (+Saturated variant) and leaf/bark cutouts
- `village_glb/` — the 12 village buildings currently EMBEDDED in the game file
  (house1-3, inn, smith, well, stands, fence, cart, bonfire, shroomhouse).
  Once these are up on your repo, Claude can switch them to URL loading and
  the game file shrinks from ~3.7MB back to ~750KB.

No single file exceeds GitHub's 100MB limit (largest is the 4096 texture atlas).
