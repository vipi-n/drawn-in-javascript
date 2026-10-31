# Drawn in JavaScript

Animated films drawn with JavaScript on an HTML canvas. Soundtracks are synthesized in code, and the Falcon 9 film adds spoken narration.

## Falcon 9: how a reusable rocket works

[Open the JavaScript player](falcon9/index.html). The 4 minute 20 second deep dive explains the Falcon 9 booster’s ascent, stage separation, return trajectories, reentry, grid fins, landing burn, guidance, recovery, and reuse. See [the project notes](falcon9/README.md) for the build steps and technical sources.

The human and dinosaur films were made with **Claude Opus 5.5** in Cursor, from the prompts below.

**▶ Watch live:** [human evolution (56 s)](https://vipi-n.github.io/drawn-in-javascript/human/) · [dinosaurs to birds (47.5 s)](https://vipi-n.github.io/drawn-in-javascript/dinosaur/)

| Film | Folder | Length | Story |
|---|---|---|---|
| **Still Curious**: the history of human evolution | [`human/`](human/) | 56 s | 7 million years ago → today |
| **Still Here**: from dinosaurs to birds | [`dinosaur/`](dinosaur/) | 47.5 s | Triassic → asteroid → the robin in your garden |
| **From Beads to Bits**: the evolution of computers | [`computer/`](computer/) | 66 s | abacus → punched cards → computers → cloud and AI |
| **Gone Fishing**: a day by the river and in the jungle | [`fishing/`](fishing/) | 120 s | morning walk → fishing and a big catch → jungle camp lunch → sunset dessert → sleeping under the stars |

## From Beads to Bits: the evolution of computers

Open the [JavaScript player](computer/index.html).

Inspired by the crayon animation in `gVuAJ_uw1CUtQX3t.mp4`, the film uses warm paper, uneven ink outlines, textured color, handwritten dates, and a small abacus bead that comes alive. The camera follows that bead along a winding path, changing height and scale as it explores the abacus, Jacquard punched cards, Babbage's Analytical Engine design, an electronic computer, the transistor, integrated circuit, microprocessor, personal computer, World Wide Web, smartphone, and today's connected computers and AI. The final image shows a person at a laptop connected to servers and a clearly labelled AI chip. The score is an original 120 BPM electronic piece; its analog pulses gain drums and a brighter lead as the machines become digital.

All graphics are drawn in [`computer/js/film.js`](computer/js/film.js) and [`computer/js/world.js`](computer/js/world.js) with the crayon toolkit in [`computer/js/ink.js`](computer/js/ink.js). The score is synthesized in [`computer/js/music.js`](computer/js/music.js), and [`computer/tools/render.js`](computer/tools/render.js) produces the video and WAV offline with a local Canvas implementation and FFmpeg.

---

## Still Curious: human evolution in under a minute

### Prompt

> The history of human evolution in under one minute. Draw every frame of this animation in JavaScript. Here is the video reference, I pasted the video in the current app folder. I want the visuals and animation like this. Also add music to this animation.

A follow-up prompt:

> Make the same kind of video for human evolution. I gave the reference so you can see all things like design, animation etc. Make it for humans, and don't change the dinosaur one, keep it as well.

*(The reference video was a hand-drawn, crayon-style animation. It was used only for visual style and is not included in this repo.)*

### The story

1. **7 million years ago:** an ape swings through the jungle, falls off a branch, sees stars, and then stands up on two legs for the first time.
2. **2.6 million years ago:** it knocks two stones together and makes the first hand axe. A spark flies off...
3. **1 million years ago:** ...and becomes a campfire. A sabre-tooth cat creeps out of the dark, and a burning torch drives it away.
4. **300,000 to 70,000 years ago:** the ice age. The walk goes past mammoths and through a blizzard, and the people huddle around a tiny fire until the sun returns.
5. **40,000 years ago:** cave art. A hand stencil, a painted mammoth, a painted sun.
6. **12,000 years ago to 57 years ago:** one continuous walk through time:
   - farming, with a dog joining in;
   - pushing a cart past the pyramids;
   - waving at a sailing ship;
   - a city street, then a rocket.

   The walker changes clothes each time he passes behind a bush, an obelisk or a phone box.
7. **The Moon:** one small step.
8. **Today:** a toddler's first wobbly steps under the same tree the ape hung from. A butterfly lands on the child's hand: *still curious.* The film then loops back to the start.

---

## Still Here: dinosaurs to birds in under a minute

### Prompt

> The history of evolution in under one minute. Draw every frame of this animation in JavaScript. Here is the video reference. I want the visuals and animation like this. Also add music to this animation.

### The story

1. A tiny dinosaur hatches in the Triassic and runs through the Jurassic, between giant legs.
2. It meets a T-rex, then escapes.
3. There's a sunset, and then the asteroid hits.
4. Dust and darkness follow.
5. Life returns, and the little dinosaur's descendant is a robin.
6. The robin's nest holds an egg, and the film loops back to the hatching.

---

## Run it locally

You don't need to install anything and you don't need a server.

1. Download or clone this repo:
   - With git: `git clone https://github.com/vipi-n/drawn-in-javascript.git`
   - Without git: on the repo page, click **Code** → **Download ZIP**, then unzip it.
2. Open a film in a browser (Chrome is recommended):
   - Human evolution: double-click `human/index.html`.
   - Dinosaurs: double-click `dinosaur/index.html`.
   - Computers: double-click `computer/index.html`.

   Or from a terminal:
   ```bash
   open human/index.html        # macOS
   xdg-open human/index.html    # Linux
   start human\index.html       # Windows
   ```
3. Wait for the music to finish generating, then click **play**.

An internet connection is only used to load the handwriting font (Patrick Hand from Google Fonts). Offline, the captions fall back to a normal font and everything else still works.

**Optional: a local server.** Opening the file directly works fine. If your browser blocks anything, run a tiny server from the repo folder and open the URL it prints:
```bash
python3 -m http.server 8000
# then visit http://localhost:8000/human/  or  http://localhost:8000/dinosaur/
```

### Controls

| Control | What it does |
|---|---|
| **play / pause** | start or stop the film |
| **slider** | jump to any moment |
| **loop** | repeat the film forever |
| **sound** | music on or off |
| **save video** | records the film in real time and downloads it as an `.mp4` or `.webm` |

**URL options:**
- `index.html?t=36` opens the film paused at 36 seconds.
- `index.html?sheet=0,15,0.5&cols=6` shows a contact sheet of frames from 0 to 15 seconds, every 0.5 seconds.

---

## How it works

- **Canvas:** 1080×1080 at 24 fps. Each scene is a pure function of time, `scene(t)`, so any frame can be drawn instantly and the slider is exact.
- **Hand-drawn look:**
  - Every line wobbles a little, and the wobble changes every 2 frames. This is the "line boil" of traditional animation.
  - Colour is laid down as rough hatching with a paper-grain texture, like crayon.
- **Characters:** rubber-hose limbs with simple inverse kinematics. The human film uses one rig with an `evo` value from 0 (ape) to 1 (modern human), so the character gradually stands taller, loses fur and changes posture.
- **Transitions:** the camera zooms into objects to move between scenes: a spark becomes a campfire, the cave mouth goes dark, a painted sun becomes the real sun.
- **Music:** built sample by sample in `music.js`:
  - Marimba, glockenspiel, plucked strings, piano, pads, bass and drums, with a small reverb.
  - Sound effects (roar, fire crackle, stone clacks, dog bark, rocket rumble, and more) timed to the action.
  - The end of the track wraps into the start, so the loop is seamless.

### Files

```
human/
  index.html      player page
  js/ink.js       canvas setup, wobbly ink lines, crayon hatching, text
  js/kit.js       shared props (sun, clouds, plants, mammoth...)
  js/people.js    the hominin rig (ape → human), kid, sabre-tooth, dog, butterfly
  js/world.js     trees, fire, snow, cave art, pyramids, ship, city, rocket, moon
  js/scenes.js    the timeline: every scene and caption
  js/music.js     the score and sound effects
  js/main.js      playback, controls, audio, video export

dinosaur/
  index.html
  js/ink.js  js/characters.js  js/scenes.js  js/music.js  js/main.js
```

---

The human and dinosaur films were made with Claude Opus 5.5 in Cursor.
