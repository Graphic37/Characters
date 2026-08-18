# ASHEN HOLLOW

Single-page ARPG. `index.html` is the game; open it in a browser or serve the
folder over HTTP.

    python3 -m http.server 8000     # then visit http://localhost:8000

## Layout

    index.html          the game
    assets/             carved UI frames, pulled out of the stylesheet
    data/               map JSON that is not loaded at runtime, kept for reference
    src/                the ASHEN DEPTHS dungeon generator, in parts, plus the
                        build scripts that assemble and patch it

## Size

| | |
|---|---|
| index.html | 939 KB |
| index.html, gzipped over the wire | 289 KB |
| assets/ | 130 KB |

GitHub Pages and every CDN serve gzip automatically, so the real download is
about 420 KB for the whole game including images — the 1.1 MB figure is the
uncompressed file on disk, not what a player waits for.

Two embedded PNGs were 174 KB of base64 inside the stylesheet. base64 costs
about 33% over the bytes it encodes, so moving them to real files took 217 KB
off the HTML for 130 KB of images, and they now cache separately from the page.

## Recovery

Load with `?reset` to clear saved state, `?wipe` to clear the whole origin.

## Diagnostics

Press **F8** in game for a status dump (copied to clipboard): where you are,
what Auto is doing and why, plus an automatic scan for known failure modes.

## Offline / no-CDN build

`vendor/three/` holds three.js r160 and the five addons the game imports, and
the importmap points at them instead of jsdelivr. Verified with all off-site
traffic blocked: **no failed local requests, no page errors** — three.js is no
longer a network dependency.

**This is not yet fully offline.** The town, hero and NPC models are still
fetched from `raw.githubusercontent.com` (24 requests). To ship on Steam those
need vendoring too — drop them under `assets/models/` and repoint the loader
paths. That is the remaining work, not a bug.

## Why "THREE is not defined" happens

Opening `index.html` straight from disk (`file://`) cannot work: module scripts
and the importmap are blocked by CORS from `origin: null`, three.js never
loads, and the game shows its "Scene failed to start" screen. Serve it:

    npx serve .            # then open http://localhost:3000

The single-file build has the same CDN dependency but works normally when
you have a connection.
