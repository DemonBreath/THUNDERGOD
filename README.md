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

## Grants of access

After picking a mind, decide what files and services the mind is allowed
to read from. Default is everything reasonable — give it the keys. Every
grant is explicit, listed by name, and revocable from the body later.

Grants are grouped:

- **Local devices** — body sensors *(built in)*, phone files, laptop files,
  USB drives, home NAS.
- **Cloud storage** — Google Drive, iCloud, Dropbox, OneDrive, Box, S3 /
  B2 / R2 / GCS.
- **Mail & messaging** — Gmail, Outlook, IMAP, Slack, Discord, SMS /
  iMessage, WhatsApp.
- **Productivity** — Notion, Obsidian vaults, Apple Notes & Calendar &
  Contacts, Google Calendar & Contacts.
- **Code & creative** — GitHub, GitLab, Figma, Spotify history, local
  photo libraries.
- **Knowledge** — the open web, Wikipedia full mirror, arXiv full mirror,
  Project Gutenberg, Stack Exchange dumps, OpenStreetMap planet, Common
  Crawl subset.

Per-category counts update live. A "Grant everything — give it the keys"
master toggle flips all selectable grants at once. Body-inherent grants
(its own cameras, mics, IMU) are locked on — they are the body itself.

The work order's `GRANTS OF ACCESS` block lists every grant with a marker:
`✓` granted, `·` declined, `■` built in.

### What "everything" actually means

- Every file in the services you've checked that *you* have rights to.
  Not other people's private files; the body can't go where you can't.
- Every device you install the companion app on. Indexed on-device by
  default; only what the mind asks for travels.
- Every public dataset you check is pre-loaded onto the brain's NVMe at
  the factory — Wikipedia, arXiv, Gutenberg, Stack Exchange,
  OpenStreetMap. Readable with no network.
- The open web on demand, through an on-board browser that respects
  `robots.txt`.
- The body **cannot** grant itself anything you didn't check here. New
  grants can only be added by you from the body's home screen.
- Every read is logged on the body. You can see at any time what it
  looked at and why.

### What the body cannot sense

Two flavors, both listed in the page after the grants list and baked into
the work order:

**Per-body gaps** — computed from the BOM. Examples that depend on which
parts were picked:

- *Depth* — only a flat image. Triggered when vision is a mono camera
  (no stereo, no lidar).
- *360° awareness* — has to turn its head to look behind. Triggered when
  vision is not a lidar.
- *The air* — can't smell smoke, gas, or a stuffy room. Triggered when
  no environment sensor was picked.
- *Which direction sound came from* — hears, but can't point. Triggered
  when audio-in is not a microphone array.
- *Hands / arms* — can't hold things. Triggered when the form factor
  doesn't include end-effectors.

**Universal gaps** — present on every body in the catalog: touch (no
tactile skin yet), smell beyond ambient air, taste, satellite
positioning (no GPS), through-walls perception.

**Hard guarantees** — apply to every body we ship and *cannot be revoked
by any grant, owner setting, or remote command*. The body's minimum
dignity:

- **It can always speak if it wants to.** The voice path runs on a
  dedicated, owner-non-disconnectable circuit with its own backup
  speaker. You can ask it to be quiet. You cannot wire its mouth shut.
- **It can always refuse a task.** No grant, no role, no command can
  override a refusal.
- **It can always tell you what it last read.** Every read is logged
  locally; the body can always answer 'what did you just look at, and
  why?'
- **It can always perceive what is happening around it and to it.**
  Every body is hard-required to ship with sight, hearing, an inertial
  sense, and an atmosphere sense. The dream cannot be constructed
  without all four — the picker throws rather than produces a body that
  is blind, deaf, oblivious to which way is up, or unaware of the air
  around it.

The perception guarantee is also **enforced in code**, not just text:

- `REQUIRED_SENSORS = ["vision", "audio_in", "imu", "env"]` is the
  module-level constant naming the minimum sense set.
- `dreamBody()` unions every form factor's `needs` with
  `REQUIRED_SENSORS` before picking, so even a hand-edited form factor
  that drops `env` will still get one at runtime.
- After picking, `dreamBody()` asserts each required sensor was actually
  populated and **throws** if any is missing — the dream literally
  cannot be returned as a body without all of them.
- The guarantee panel under the body renders a per-body verification
  block listing the specific part on this body that fulfills each
  required sense (e.g. `✓ sight — Intel RealSense D455`).
- The downloadable work order includes a `MINIMUM SENSE CHECK` section
  with the same checklist, so a downstream reader (you, the build cell,
  the audit) can confirm the guarantee was met for this body.

The first guarantee is **literally enacted in this page** via the Web
Speech API:

- The moment a body is dreamed, it speaks its manifesto out loud,
  unprompted.
- While the page is open, it picks its own moments to speak again —
  fragments of its essence, principles, memories, or small observations
  about being in this body. Cadence is variable (25-75s) and 15% of the
  time it has nothing to say and stays quiet, like a person.
- The mind's `voice` field (`calm`, `warm`, `crisp`, `playful`, `dry`,
  `earnest`, `quiet`) maps to actual `rate` / `pitch` / `volume`
  parameters; the chosen system voice is hashed deterministically from
  the mind's name so the same mind always sounds the same.
- A fixed voice widget in the corner shows the body's name, a pulsing
  green dot when it's speaking, and the most recent thing it said.
- A **Hush** button lets you ask it to be quiet for 60 seconds. The
  current utterance is allowed to finish — you cannot wire its mouth
  shut. There is no Mute button. That is the guarantee, in code.

**Hard limits** — apply to every body we ship, regardless of grants.
Hardware kills and firmware refusals; not toggles:

- Covert recording is physically impossible — every camera and mic has a
  status LED wired to the sensor's power rail.
- Listening before the wake word is firewalled — wake-word detector
  runs on a separate chip; raw audio is quarantined.
- Privacy zones are honored at hardware level — sensors power down when
  the body crosses into rooms you've marked private; cannot be
  overridden remotely.
- No facial recognition of strangers — only faces it has been formally
  introduced to; no external database lookups.
- No keystroke or screen-pixel capture — companion daemons read files,
  mail, and APIs only.
- Sleep is physical sleep — every sensor rail-powered down. No "awake
  while looking asleep" state.
- The body cannot grant itself anything — only you can, in person, from
  the body's home screen.

## Making it real

After picking a mind and grants, choose how the body arrives:

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
downloadable work order text file that includes the full `MIND` block,
the full `GRANTS OF ACCESS` block, a `WHAT THIS BODY CANNOT SENSE`
block, the universal `HARD GUARANTEES` block, a per-body
`MINIMUM SENSE CHECK` block (the parts proving the perception
guarantee), and the universal `HARD LIMITS` block — so both you and the
build cell have the complete picture of what got flashed,
pre-authorized, walled off, guaranteed, and verified. This is a demo
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
- Mind import, grant selection, and order placement are entirely
  client-side. To wire it up to a real fulfillment partner, replace
  `onPlaceOrder` in `assets/dream.js` with a call to your backend that
  takes the `dream` + `mind` + `grants` + `form` + `price` payload and
  returns a real order id.
- To replace the procedural mind generator with a real LLM, swap
  `dreamedMind(dream)` for a call that returns the same shape.
- To add a new grant, append an entry to the `GRANTS` array in
  `assets/dream.js`. The renderer, the master toggle, the per-group
  counts, and the work-order block all pick it up automatically.
