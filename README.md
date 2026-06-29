# THUNDERGOD

A small storm in a browser. Procedural lightning, moody sky, synthesized thunder — one HTML file, one CSS file, one JS file. No build step, no dependencies.

![runic mark](https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Runic_letter_thurisaz.svg/40px-Runic_letter_thurisaz.svg.png)

## Run it

Open `index.html` in any modern browser. That's it.

For local development with a tiny static server (optional):

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Controls

| Input            | Effect                                      |
| ---------------- | ------------------------------------------- |
| `click`          | Summon a bolt from the clouds to the point  |
| `drag`           | Arc lightning between cursor positions      |
| `space`          | Toggle tempest (automatic storm)            |
| `m`              | Mute / unmute synthesized thunder           |

## What's inside

- **`index.html`** — the page shell and the HUD.
- **`style.css`** — typography, the stormy palette, and overlay layout.
- **`lightning.js`** — the whole show:
  - Fractal midpoint-displacement bolt generator with recursive branching.
  - Four-pass canvas rendering (broad-soft → thin-hot) for cheap bloom, using
    `mix-blend-mode: screen` on the bolt canvas.
  - Drifting cloud bands, twinkling stars, ambient + distant flashes.
  - Spark particles at impact points.
  - Synthesized thunder via the Web Audio API: a sharp high-passed crack
    followed by a low-passed rolling rumble, delayed by simulated travel time.

## Notes

- Honors `prefers-reduced-motion` for the runic float animation and skips
  spontaneous distant flashes.
- The bolt canvas uses screen blending so glow layers compose additively;
  fades come from clearing each frame and redrawing live bolts with a
  decaying alpha.
- Audio stays muted until the first interaction (browsers require it).

Built for the joy of it.
