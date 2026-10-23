# personal-website

A BumpTop-style 3D room you look down into. Everything in it is from my life:
the Yamaha F310, a half-finished painting, the laptop running maps.gov.sg, the
Placecom hoodie, polaroids on the rug, and two doors that open onto the outside.

Plain static files: Three.js comes from a CDN through an import map, so there is no build step.

## Run it

```sh
python3 -m http.server 8000   # ES modules need http://, not file://
open http://localhost:8000
```

Deploy by pushing to any static host (GitHub Pages works as-is).

## What's where

| File | What it does |
| --- | --- |
| `js/content.js` | **All the words.** Card copy, detection labels, polaroids, gigs, places. Edit this first. |
| `js/room.js` | Room layout, lights, polaroid physics, guitar chords |
| `js/props.js` | The objects, modelled from primitives |
| `js/textures.js` | Every surface, painted on a canvas at load time (no image files) |
| `js/vision.js` | Machine view (Sobel edges + optical flow) and the detection boxes |
| `js/worlds.js` | Behind the doors: the gig crowd and the floating islands |
| `js/rig.js` | The eased orbit camera |
| `js/audio.js` | Karplus–Strong plucked strings for the guitar |

## Things to try

- Brush across the guitar strings (it plays G, D, Em, C).
- Drag across the easel canvas to finish the painting. The bare half is a real Sobel edge map of the painted half.
- Flick the polaroids around.
- Tap the hoodie twice to turn it around.
- Press `V` for machine view. The flow arrows are real: every pixel's depth is reprojected through last frame's camera.

## Using real photos

Polaroids use drawn motifs for now. To use a photo, load it with `THREE.TextureLoader`
in `textures.js#polaroid` and draw it into the 440×440 photo area in place of `MOTIFS[motif]`.
For the hoodie, guitar and easel, image-to-3D tools (Meshy, Tripo, Rodin) can turn
photos into `.glb` files; load them with `GLTFLoader` and swap them in for the
primitive models in `props.js`, keeping the same `register(...)` calls in `room.js`.
