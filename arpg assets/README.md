# ASHVEIL / ASHEN HOLLOW — asset pack

Every generated image, at full generation resolution, plus an `optimised/` set
resized to what each asset actually renders at.

**Host the `optimised/` set.** raw.githubusercontent.com serves absolute https,
which is the only kind of URL a page opened from `file://` can fetch.

## Slice numbers for the 9-slices

| asset | slices (top right bottom left) | border in use |
|---|---|---|
| panel-frame | 75 all round | 20px |
| header-band | 0 / 25 / 0 / 25 + `fill` | 0 25px |
| socket-frame | 33 all round + `fill` | 5px |
| control-plate | 7 / 12 / 7 / 24 + `fill` | 5 7 5 13px |
| tooltip-frame | 42 / 9 / 9 / 9 | variable top, 9px |
| capsule-frame | 8 / 28 / 8 / 28 | 9 26px |
| gem-row-plaque | 7 / 35 / 7 / 35 + `fill` | 6 24px |

## Notes that cost time to learn

- `iron.png` does NOT tile vertically — use MirroredRepeatWrapping.
- `cobblestone`, `wall-stone` and `wood-planks` tile cleanly on both axes.
- Anything near-black needs its RGB lifted before it will read on a dark surface.
- The rarity plates and highlights arrive far too strong; halve their alpha.
- `flame.png` is unused: a camera-facing flame billboard reads flat in isometric.
- `puddle.png` is unused: the decals were removed in v12.

## Originals

| file | bytes |
|---|---|
| `reference/inventory-mockup.png` | 2,726,883 |
| `reference/three-heroes.png` | 1,486,544 |
| `reference/town-concept.png` | 3,179,569 |
| `town/awning.png` | 1,305,550 |
| `town/banner.png` | 1,597,640 |
| `town/ember-spark.png` | 170,666 |
| `town/fire-wide.png` | 1,646,394 |
| `town/flame.png` | 985,214 |
| `town/glow.png` | 953,140 |
| `town/ground-cobblestone.png` | 3,645,697 |
| `town/iron.png` | 3,372,456 |
| `town/puddle.png` | 1,969,722 |
| `town/smoke.png` | 1,492,946 |
| `town/wall-stone.png` | 3,202,186 |
| `town/waypoint-rune-disc.png` | 2,306,302 |
| `town/wood-planks.png` | 3,100,525 |
| `ui/bar-track-and-fill.png` | 1,186,287 |
| `ui/capsule-frame.png` | 265,223 |
| `ui/control-plate.png` | 398,927 |
| `ui/corner-ornament.png` | 245,540 |
| `ui/cursor-deny.png` | 670,593 |
| `ui/cursor-grab.png` | 1,118,743 |
| `ui/cursor-normal.png` | 1,232,233 |
| `ui/emblem-crossed-swords.png` | 1,221,308 |
| `ui/fx-currency-burst.png` | 2,161,045 |
| `ui/fx-equip-ring.png` | 961,618 |
| `ui/fx-salvage-shatter.png` | 924,388 |
| `ui/gem-row-plaque.png` | 329,922 |
| `ui/grid-cell.png` | 3,214,153 |
| `ui/header-band.png` | 406,707 |
| `ui/highlight-blocked.png` | 476,064 |
| `ui/highlight-swap.png` | 1,122,657 |
| `ui/highlight-valid.png` | 313,327 |
| `ui/new-item-star.png` | 159,718 |
| `ui/ornamental-rule.png` | 331,324 |
| `ui/padlock.png` | 1,980,050 |
| `ui/panel-frame.png` | 781,142 |
| `ui/paperdoll-figure.png` | 1,016,391 |
| `ui/rarity-magic.png` | 701,601 |
| `ui/rarity-normal.png` | 1,095,888 |
| `ui/rarity-rare.png` | 1,135,470 |
| `ui/rarity-unique.png` | 882,202 |
| `ui/socket-frame.png` | 2,570,381 |
| `ui/socket-ring-empty.png` | 1,005,892 |
| `ui/socket-ring-filled.png` | 967,027 |
| `ui/socket-ring-locked.png` | 1,173,710 |
| `ui/tab-currency.png` | 606,523 |
| `ui/tab-dump.png` | 1,365,947 |
| `ui/tab-gear.png` | 1,842,997 |
| `ui/tab-gems.png` | 400,693 |
| `ui/tier-pip.png` | 90,545 |
| `ui/tooltip-frame.png` | 409,682 |
| `ui/world-backdrop.jpg` | 2,056,387 |

## Optimised

| file | bytes |
|---|---|
| `optimised/town/awning.png` | 219,053 |
| `optimised/town/banner.png` | 159,287 |
| `optimised/town/ember-spark.png` | 2,975 |
| `optimised/town/fire-wide.png` | 200,998 |
| `optimised/town/flame.png` | 34,093 |
| `optimised/town/glow.png` | 40,486 |
| `optimised/town/ground-cobblestone.jpg` | 353,463 |
| `optimised/town/iron.jpg` | 290,225 |
| `optimised/town/puddle.png` | 138,018 |
| `optimised/town/smoke.png` | 48,442 |
| `optimised/town/wall-stone.jpg` | 283,116 |
| `optimised/town/waypoint-rune-disc.png` | 1,020,561 |
| `optimised/town/wood-planks.jpg` | 296,419 |
| `optimised/ui/bar-track-and-fill.png` | 532,386 |
| `optimised/ui/capsule-frame.png` | 37,142 |
| `optimised/ui/control-plate.png` | 98,423 |
| `optimised/ui/corner-ornament.png` | 14,584 |
| `optimised/ui/cursor-deny.png` | 8,030 |
| `optimised/ui/cursor-grab.png` | 12,176 |
| `optimised/ui/cursor-normal.png` | 16,820 |
| `optimised/ui/emblem-crossed-swords.png` | 19,380 |
| `optimised/ui/fx-currency-burst.png` | 390,392 |
| `optimised/ui/fx-equip-ring.png` | 80,453 |
| `optimised/ui/fx-salvage-shatter.png` | 131,579 |
| `optimised/ui/gem-row-plaque.png` | 94,150 |
| `optimised/ui/grid-cell.png` | 57,307 |
| `optimised/ui/header-band.png` | 172,297 |
| `optimised/ui/highlight-blocked.png` | 8,423 |
| `optimised/ui/highlight-swap.png` | 11,261 |
| `optimised/ui/highlight-valid.png` | 10,784 |
| `optimised/ui/new-item-star.png` | 1,527 |
| `optimised/ui/ornamental-rule.png` | 90,445 |
| `optimised/ui/padlock.png` | 8,857 |
| `optimised/ui/panel-frame.png` | 183,017 |
| `optimised/ui/paperdoll-figure.png` | 115,290 |
| `optimised/ui/rarity-magic.png` | 13,027 |
| `optimised/ui/rarity-normal.png` | 12,574 |
| `optimised/ui/rarity-rare.png` | 12,002 |
| `optimised/ui/rarity-unique.png` | 18,462 |
| `optimised/ui/socket-frame.png` | 137,363 |
| `optimised/ui/socket-ring-empty.png` | 10,987 |
| `optimised/ui/socket-ring-filled.png` | 10,981 |
| `optimised/ui/socket-ring-locked.png` | 12,511 |
| `optimised/ui/tab-currency.png` | 10,888 |
| `optimised/ui/tab-dump.png` | 12,738 |
| `optimised/ui/tab-gear.png` | 16,067 |
| `optimised/ui/tab-gems.png` | 7,842 |
| `optimised/ui/tier-pip.png` | 585 |
| `optimised/ui/tooltip-frame.png` | 95,918 |
| `optimised/ui/world-backdrop.jpg` | 87,582 |
