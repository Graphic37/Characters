# models — upload this folder to `arpg assets/models/` in the Characters repo

| file | what it is | replaced |
|---|---|---|
| Warrior/Ranger/Rogue/Wizard/Monk/Cleric.glb | the six playable heroes | 15.4 MB of base64 embedded in the HTML |
| Garrick.glb | blacksmith idle | Happy Idle.fbx (3.76 MB) |
| Mara.glb | quartermaster idle | Breathing Idle.fbx (5.79 MB) |
| Veyra.glb | occultist idle | old happy idle.fbx (19.34 MB) |

The three NPCs were converted FBX -> glb and their textures capped at 1024px,
re-encoded as JPEG where there is no alpha. Rigs, skins and the mixamo.com clip
are intact — each was loaded and verified after conversion.

Keep the .fbx files as masters; do not delete them.
