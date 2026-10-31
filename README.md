# Drawn in JavaScript

Short animated films where **every frame is drawn in code**. There's no video editor, no stock footage and no animation software: each scene is a JavaScript function that paints a canvas for a moment in time. Most soundtracks are composed in code too, from synthesized voices or free orchestra samples, and locked to the picture beat by beat.

The films were made with AI coding agents in Cursor. The human evolution, dinosaur and video game history films were made with **Claude Opus 5.5**. Every folder has a `prompt.txt` with the prompt that describes its film, so anyone can recreate it.

## The films

### History

| Film | Folder | Length | Format | Story |
|---|---|---|---|---|
| **Still Curious**: human evolution | `human/` | 56 s | 1080², 24 fps | An ape walks through 7 million years and becomes a toddler taking first steps. Crayon style, plays in the browser |
| **Still Here**: dinosaurs to birds | `dinosaur/` | 47.5 s | 1080², 24 fps | A tiny dinosaur survives the asteroid, and its descendant is the robin in your garden. Plays in the browser |
| **Video Games**: a history, 1958 to today | `video-game-history/` | 2:08 | 1080², 60 fps | From oscilloscope tennis to esports, each era in its own pixel style, with an orchestra + 8-bit score |
| **ISRO**: from a bicycle in Thumba to the Moon | `isro/` | 3:20 | 1920×1080, 60 fps | A cinematic documentary-style trailer of India's space programme, with a fully synthesized orchestral score |

### Nature: life cycles

| Film | Folder | Length | Format | Story |
|---|---|---|---|---|
| **Amoeba**: the life of a single cell | `amoeba/`, `amoeba-motion/` | ~65 s | 1080², 24 fps | Line-art diagrams drawn live by a glowing pen. The `-motion` folder is a second version with more camera movement |
| **Frog**: the life cycle of the common frog | `frog/`, `frog-motion/` | 2:14 | 1080², 60 fps | Spawn, embryo, tadpole, metamorphosis, hibernation, spring. `frog-motion` is v2 with a constantly moving camera and a real orchestra |
| **Cicada**: the 17-year life cycle | `cicada-motion/` | 2:15 | 1080², 60 fps | Seventeen years underground, one summer in the sun, with real cicada recordings |
| **Ant**: the life of a colony | `ant-motion/` | 1:31 | 1080×1920, 30 fps | The nuptial flight, a queen founding a nest, egg to adult, the colony as a city. Vertical, made for Reels |
| **Monarch**: the life cycle of a butterfly | `monarch/` | 2:17 | 1080², 30 fps | Egg, caterpillar, chrysalis, butterfly, and the great migration to Mexico |

### Stories, music and paintings

| Film | Folder | Length | Format | Story |
|---|---|---|---|---|
| **The Tortoise and the Hare** | `tortoise/` | 60 s | 1080², 24 fps | The fable retold as a cut-paper animation. Plays in the browser |
| **Nine to Six**: one ordinary day | `nine-to-six/` | 3:08 | 1080², 24 fps | A young man's day of metro, office and one beer, with five minutes left for his own dream. Painted style, plays in the browser |
| **You're Absolutely Right** | `absolutely-right/` | 3:23 | portrait, landscape and motion cuts | A funny lyric music video about an engineer and an AI coding agent, every word timed to the song |
| **Red Sprites over the Village** | `red-sprite/` | 9 s + still | 1080×1350, 30 fps | A living painting of red lightning above a sleeping village, interactive in the browser |

### Experiments (Python, not JavaScript)

| Project | Folder | What it is |
|---|---|---|
| **Anime Clip** | `anime-clip/` | A 14-second live-action clip redrawn as anime with AI models (AnimeGAN, Stable Diffusion + ControlNet), each character in a different show's style |
| **Chicken 3D** | `chicken-3d/` | A Blender look-development test of realistic 3D chickens and fluffy chicks, rendered as stills |

## How the films are made

There are two kinds of project in this repo.

**Browser films** (`human`, `dinosaur`, `tortoise`, `nine-to-six`, `red-sprite`) run straight from an `index.html` file:
- The film draws live on an HTML canvas, and the music is generated in the browser.
- A player has play/pause, a slider to jump anywhere, loop and sound buttons, and a **save video** button that records the film.

**Rendered films** (the life cycles, `video-game-history`, `isro`, `absolutely-right`) are rendered offline to an MP4:
- Node.js draws each frame with `@napi-rs/canvas`, the same canvas drawing API browsers use.
- The frames are piped into FFmpeg, which encodes the video and adds the soundtrack.
- The film is split into chunks that render in parallel, so a 2-minute film at 60 fps takes a few minutes.

Ideas shared across the films:
- **Every scene is a function of time.** A scene can draw any moment `t` on its own, so any frame can be rendered instantly and in any order.
- **One clock for picture and sound.** Each rendered film has a `js/cues.js` cue sheet (tempo, scene starts, story events) that both the picture and the music read. A splash on screen and its sound land on the same frame.
- **Music made in code.** Some scores are pure synthesis. Others play real instrument samples from the free VSCO-2 Community Edition orchestra and real nature recordings from BigSoundBank (both CC0). The scores are mixed with reverb and normalised to streaming loudness (-15 LUFS).

## Folder layout

Most projects look like this:

```
project/
  prompt.txt       the prompt that describes the film, so it can be recreated
  index.html       the browser player (browser films only)
  js/              the drawing code: scenes, characters, effects
  js/music/        the score and sound design (rendered films)
  tools/render.js  renders stills, contact sheets, previews and the final video
  tools/*.sh       download scripts for the free sound recordings (where used)
```

## Run them

**Browser films:** download the repo (**Code** → **Download ZIP**), unzip it, and double-click a film's `index.html`, for example `human/index.html`. Chrome is recommended. Nothing needs installing.

**Rendered films:** you need macOS (several films use the system fonts), Node.js 20 or newer, and FFmpeg.

1. In the project folder, run `npm install @napi-rs/canvas`.
2. In `js/core.js`, point the canvas import at it: `const C = require('@napi-rs/canvas');`
3. For films with a sampled score, download the free VSCO-2 Community Edition samples into `assets/vsco/`. Run the project's `tools/fetch_sfx.sh` to download its sound recordings.
4. Render:
   ```bash
   node tools/render.js --at 10          # one still frame at 10 s
   node js/music/index.js                # the score -> build/score.wav
   node tools/render.js --video          # the full film
   ```

The Python experiments list their own steps in their `prompt.txt`.

## What's not in this repo

To keep the repo small, these are left out. All of them can be rebuilt or downloaded again:
- the finished videos and rendered frames;
- the sample libraries and sound recordings;
- the reference videos some films took their visual style from. They were used only for style and belong to their creators.

## Credits

- Orchestral samples: VSCO-2 Community Edition by Versilian Studios (CC0).
- Nature recordings: BigSoundBank by Joseph Sardin (CC0).
- 3D assets in `chicken-3d`: Poly Haven and OpenGameArt (CC0). Licences are included in the folder.
- *Korobeiniki* (in the video game film) is a traditional Russian folk song from 1861, in the public domain.
- Game, show and brand names mentioned in the films belong to their owners. These are non-commercial, fan-made tributes.
