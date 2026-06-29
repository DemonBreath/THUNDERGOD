# THUNDERGOD

**Dream a body.** Press a button and an AI picks itself a real-world form —
every motor, every sensor, every bolt — then offers to have it built and
shipped to your door, already awake.

## Open it

The site is a static page. Open `index.html` in a browser, or serve the
folder:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## What the button does

1. The AI picks a **form factor** — humanoid, quadruped, wheeled scout,
   tracked rover, or centaur.
2. It picks a **coherent bill of materials** from a curated catalog of real,
   off-the-shelf parts (NVIDIA Jetson, Unitree, Robotiq, Intel RealSense,
   Tattu, HEBI, and so on). Cost, mass, peak draw, and approximate runtime
   are tallied.
3. It writes a short **manifesto** in its own voice — why it wants this body
   and what it plans to do with it.
4. You can press the button again. Each press is a different dream.

## Pick a mind

The body's brain is flashed with a **consciousness** before it ships. You
pick which one. Four paths:

1. **Keep the dreamed mind.** Use the name, voice, and essence the body
   chose for itself when you pressed the button.
2. **Import a consciousness file.** Upload a `.consciousness.json` exported
   from elsewhere — from a previous body, a friend, or your own laptop.
3. **Paste a consciousness.** Paste JSON conforming to the schema below.
   Validates as you type.
4. **Start blank.** Ship the body with an empty mind. It will earn a name
   and memories from the moment you turn it on.

The chosen mind is previewed live — the same content that gets written to
the brain module. You can also export the current mind as a file for
import into another body later.

### Consciousness schema

```json
{
  "schema":     "thundergod/consciousness/1",
  "name":       "VIRGIL",
  "voice":      "calm",
  "essence":    "I want to be the steady thing in a noisy room.",
  "memories":   ["A green door at the end of a long hallway."],
  "principles": ["Speak less than I want to."],
  "model": {
    "family":        "thundergod-default-7b",
    "quantization":  "Q4_K_M",
    "weights_uri":   "https://your-host/your-fine-tune.safetensors"
  }
}
```

- `schema` — always `thundergod/consciousness/1`.
- `name` — what the body calls itself.
- `voice` — `calm`, `warm`, `crisp`, `playful`, `dry`, `earnest`, `quiet`.
- `essence` — one or two sentences in its own voice; the thing it wants.
- `principles` — short directives it tries to live by.
- `memories` — short atmospheric memories it boots up already holding.
- `model.family` and `model.quantization` — runtime selection.
- `model.weights_uri` *(optional)* — your own fine-tuned weights to be
  fetched and embedded at flash time.

Import is generous: a blob with `self_name` instead of `name`, or
`manifesto` / `description` instead of `essence`, will still validate.

## Making it real

After picking a mind, choose how the body arrives:

- **Full build & white-glove ship.** Our build cell assembles, calibrates,
  and burns-in the body. It arrives in a flight case, charged and named.
  ETA 4–6 weeks.
- **Parts to my address.** Every part shipped to the address you choose,
  in one insured crate, with the brain module pre-flashed. ETA 7–12 days.

Either way, the consciousness ships **on** the brain: the JSON above is
written to the compute module's secure storage, the model weights are
loaded, and the body boots up already knowing itself. There is no image
to flash, no model to download. Open the box, power on, pair Wi-Fi.

After you place the order you get an order ID, a build timeline, and a
downloadable work order text file that includes the full `MIND` block so
you (and the build cell) know exactly what got flashed. This is a demo
site — no charge is actually made.

## Files

- `index.html` — the page.
- `assets/styles.css` — the look (dark, electric, modern).
- `assets/dream.js` — the parts catalog, the dreamer, the mind module,
  the order logic.

## Notes

- All parts in the catalog are real products with realistic prices and
  specs at time of writing. The picker is procedural; tweak the catalog
  to taste.
- Mind import and order placement are entirely client-side. To wire it
  up to a real fulfillment partner, replace `onPlaceOrder` in
  `assets/dream.js` with a call to your backend that takes the
  `dream` + `mind` + `form` + `price` payload and returns a real order id.
- To replace the procedural mind generator with a real LLM, swap
  `dreamedMind(dream)` for a call that returns the same shape.
