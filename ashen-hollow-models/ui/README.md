# ui — upload this folder to `ashen-hollow-models/ui/` in the Characters repo

These are NOT the same files as `arpg assets/optimised/ui/`. Each one is the
PROCESSED version the game actually uses:

* cropped to its alpha bounding box — every 9-slice number depends on this
* corrections baked in — the paperdoll figure is brightened and faded, the
  rarity plates are at 46% alpha, the tab emblems have their RGB lifted, the
  placement highlights are normalised to a matching rim

Uploading the unprocessed originals instead would break the slices and make
several assets invisible on a dark panel.
