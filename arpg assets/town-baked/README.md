# town — upload to `ashen-hollow-models/town/` in the Characters repo

These are the BAKED town textures — the exact bytes the approved build used.
They are NOT the same as `arpg assets/optimised/town/`.

The optimised set was resized but never cropped to its alpha bounding box, so
every transparent asset carries dead margin. Mapped onto a fixed-size plane
that makes the art smaller and off-square — the waypoint rune disc is the
obvious one: hosted it is 1024x683 with 176px of empty space on each side,
baked it is a 512x512 square of nothing but disc.

Other processing that travels with these files:
- rune disc quantised to 128 colours (1.7MB -> 573KB, no visible loss)
- ground/wall/timber/iron as JPEG; iron does NOT tile vertically, the code
  uses MirroredRepeatWrapping for it
- everything cropped to its alpha box first, then scaled
