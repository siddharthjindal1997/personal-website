# personal-website

A BumpTop-style 3D room you look down into. Everything in it is from my life:
the Yamaha F310, a half-finished painting, the laptop running maps.gov.sg, the
Placecom hoodie, polaroids on the rug, a sofa in front of my favourite TV episodes, and two
doors that open onto the outside.

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
| `js/content.js` | **All the words.** Card copy, detection labels, polaroids, TV episodes, gigs, places. Edit this first. |
| `js/room.js` | Room layout, lights, polaroid physics, guitar chords |
| `js/props.js` | Loads the models and layers on the moving parts (strings, canvas, screen, hoodie print) |
| `models/room.glb` | The furniture and objects, modelled in Spline (see below) |
| `js/textures.js` | Every surface, painted on a canvas at load time (no image files) |
| `js/vision.js` | Machine view (Sobel edges + optical flow) and the detection boxes |
| `js/tv.js` | The sofa corner's TV: each episode painted on the screen, and the AR note floating beside it |
| `js/worlds.js` | Behind the doors: the gig crowd and the floating islands |
| `js/rig.js` | The eased orbit camera |
| `js/audio.js` | Karplus–Strong plucked strings for the guitar |

## Things to try

- Brush across the guitar strings (it plays G, D, Em, C).
- Drag across the easel canvas to finish the painting. The bare half is a real Sobel edge map of the painted half.
- Flick the polaroids around.
- Tap the hoodie twice to turn it around.
- Sit on the sofa. The TV plays my favourite episodes, each with a note pinned beside it; tap the TV (or use ← →) for the next one. Add episodes, or a whole show, in `content.js#SHOWS`.
- Press `V` for machine view. The flow arrows are real: every pixel's depth is reprojected through last frame's camera.

## Editing the models

The guitar and its stand, easel set, desk, chair, laptop, coat rack, hoodie, door frame,
door leaf, window, lamp, the room shell (plank floor, walls, mouldings, rug), the cat, its
space helmet, the portal's frame, and the sofa corner (sofa, side table, wall TV, media console)
live in one Spline file. The cat is one model; each of
the six coats is a canvas texture (`textures.js#catCoat`) painted onto its body. Each is a top-level group, laid out
along x at 200 Spline units to the metre, and built in the same local frame `props.js` places
it in. Parts the site retextures or drives (`Guitar Top`, `Laptop Screen`, `Hoodie Front`, `TV Screen`, …)
are found by name, so keep those names.

To ship a change:

1. In Spline, update the code export (Export → Code → three.js).
2. Open `tools/spline-to-glb.html` through the local server, paste the export URL, and convert.
   It bakes each group into metres with standard PBR materials and downloads `room.glb`.
3. Compress it into the site:

   ```sh
   npx gltfpack -i ~/Downloads/room.glb -o models/room.glb -cc -kn -km -kv -vtf
   ```

   `-kn -km` keep the part names and materials apart, `-kv -vtf` keep plain UVs for the
   canvas textures.

## Using real photos

Polaroids use drawn motifs for now. To use a photo, load it with `THREE.TextureLoader`
in `textures.js#polaroid` and draw it into the 440×440 photo area in place of `MOTIFS[motif]`.
