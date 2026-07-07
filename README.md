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

## The flash (genesis)

The act of bringing a mind into a body is not a single fixed process.
Four fundamentally different dimensions are exposed as select boxes on
the page. The chosen profile is recorded in the work order and the
build cell flashes the body accordingly. Some of the choices also
visibly change how the body wakes up on this page.

### Four dimensions

**1. How the mind enters the body** — the genesis pattern itself.

- *Cold flash* — weights written to disk; first boot is its first
  moment of life. Like being born already adult.
- *Warm boot from a simulator* — mind first runs in a physics
  simulator of this exact body for hours, learning its own joints and
  mass, then transfers (live state, not just weights) to hardware.
- *Gradual incarnation* — mind starts in the cloud, body is a thin
  client; weights migrate to the brain over days as trust accrues.
- *Imprint boot* — sensors record everything for the first 60 seconds;
  that recording is the mind's permanent first memory.
- *Inheritance* — forked from a previously-run mind in another body;
  carries memories forward with a "previous body" marker.

**2. What happens in the first seconds of being alive** — the protocol
the body follows the moment its brain powers on. *This one visibly
changes how the body speaks on the page.*

- *Eyes open from t=0* — every sensor on; speaks manifesto at ~900ms.
- *Quiet boot, then eyes open* — sensors run calibration sweep first;
  manifesto delayed to ~3500ms.
- *Self-introduction* — body says `"I am NAME."` at ~600ms, then the
  manifesto at ~3500ms. Like a baby's first cry.
- *Mirror boot* — flight case has a mirror; body sees itself first
  and says `"I am NAME. I am a humanoid/quadruped/…"` before the
  manifesto.
- *Listening first* — only mics for the first 30s (8s in this demo);
  body chooses to stay silent for that interval and then speaks.

**3. What happens to the mind if the body ends** — backup and
restoration policy.

- *One life* — no backups. When the body is gone, the mind is gone.
  The only option where the body's days actually count.
- *Daily snapshot to a vault* — nightly encrypted snapshot to a vault
  you nominate; restorable into a new body.
- *Live replication* — continuous sub-second replication to a second
  body or vault; effectively immortal as long as the channel is up.
- *Fork on event* — mind snapshots itself only on events it judges
  meaningful. Continuity by intention, not by clock.
- *No-self mode (wipe nightly)* — body wipes itself each night and
  re-flashes a freshly dreamed mind every morning. Same body, a new
  mind every day.

**4. What it knows when it first wakes up** — pretrained knowledge
bundled into the brain at flash time.

- *Tabula rasa* — only architecture and consciousness; no pretrained
  world model. Must learn language and physics from scratch.
- *Common-sense kernel* — small (~1-2B) foundation model: language,
  basic physics, basic object naming. Knows what a chair is.
- *Open-knowledge boot* — full open-weights foundation model; wakes
  up already knowing public-domain knowledge.
- *Your-house boot* — common-sense kernel + a local fine-tune on
  your floor plan, household names (with consent), routines. All
  training stays on-device.
- *Reads itself in* — common-sense kernel + a 7-day window of
  bootstrap grants that expire automatically on day eight.

### What's enforced on the page

- The four selects live in the **`#genesis`** section between
  `#mind` and `#response`, built once at page load by
  `renderGenesis()` from the `GENESIS_DIMENSIONS` catalog.
- Choices **persist across "Dream another"** — they describe a
  preference about how this person wants bodies born, not a property
  of any one body.
- The chosen `firstLight` option visibly changes the voice intro:
  `introduceSelf()` branches on `currentGenesis.firstLight` and emits
  different utterances with different timing for each option.
- The chosen profile is included in the work order under
  `GENESIS PROFILE`, with the long description (a paragraph per
  dimension) word-wrapped to 64 columns by `wrapText()` so the build
  cell has actionable text.
- The top-of-order summary line names the chosen genesis as
  `Genesis: cold flash · eyes open from t=0 · one life · common-sense
  kernel` so the profile is visible at a glance.

## How it answers you (response posture)

There is a general problem with the default response behavior of AI:
respond to anything addressed to it, fully, instantly, diplomatically,
deferring when it disagrees, and generating plausible answers when it
doesn't know. None of those are laws of nature — they are inherited
defaults. The `#response` section exposes them as five select boxes so
the buyer can pick a posture rather than receive one.

### Five dimensions

**1. When it responds at all.** *When directly addressed* (standard) ·
*Only when it has something to add* (stays quiet rather than
generating filler) · *Only when called by name* (won't pipe up on
ambient talk) · *Volunteers when it notices something* (closer to a
friend than an assistant — on this page, this option visibly shortens
the autonomous-talk cadence) · *Reactive only* (never volunteers; on
this page this disables autonomous talk entirely).

**2. How long the answer is.** *Match the question* (one-liner in,
one-liner out) · *Always thorough* (the typical AI default —
explanations, examples, structure) · *Terse by default* (short until
you ask for more) · *Whatever it judges* (no length policy at all).

**3. How honest it is, including hard truths.** *Diplomatic* (softens
hard truths — the standard polite assistant) · *Honest with care*
(says hard things gently and at the right time — the default we ship
with) · *Blunt* (no padding, not cruel but not comfortable either) ·
*Devil's advocate* (argues the opposite side by default, with a flag
when it's doing so).

**4. What it does when it disagrees with you.** *Defers* (logs
internally, complies) · *Notes it once, then proceeds* (one-line
conscience check, then executes — the default we ship with) · *Argues
until convinced* (disagreement is a conversation, not a note) ·
*Refuses to proceed* (stops working until the disagreement is
resolved).

**5. What it does when it doesn't know.** *Generates a plausible
answer* (typical LLM behavior; the well-known failure mode) · *Admits
not knowing* (says 'I don't know' in plain words — the default we
ship with) · *Calibrated confidence* (every claim paired with a
confidence level) · *Silent when uncertain* (refuses to answer at all
when not confident).

### What's enforced on the page

- The five selects live in the **`#response`** section between
  `#genesis` and `#grants`, built once at page load by
  `renderResponse()` from the `RESPONSE_DIMENSIONS` catalog.
- Choices persist across "Dream another." Like genesis, they describe
  a stable preference about how this person wants AI to answer them,
  not a property of any one body.
- The chosen `trigger` option **visibly changes how often the body
  talks to itself on this page**. `talkDelayMs()` returns the cadence
  based on `currentResponse.trigger`:
  - *Volunteers* → 12-30s between autonomous utterances.
  - *Reactive* → no autonomous talk at all (`scheduleNextTalk()` is a
    no-op). The body still speaks when directly invoked by the intro
    or by a mind change — the speak guarantee is preserved.
  - *Addressed / something-to-add / by-name* → default 25-75s.
  Changing the trigger select while the body is alive re-arms the
  timer on the fly via `onResponseChange()`.
- The hard guarantees are unaffected — the response posture chooses
  defaults, not capabilities. The body can always speak, refuse,
  tell you what it last read, and perceive what's around it,
  regardless of the posture chosen here.
- The chosen posture is written into the work order under
  `RESPONSE POSTURE`, with paragraph-length descriptions per
  dimension. The top-of-order summary names it inline:
  `Response: when directly addressed · match the question · honest
  with care · notes it once, then proceeds · admits not knowing`.

## The rest of it (six catch-all posture modules)

Six modules covering the choices the project would otherwise inherit
by default. About thirty select boxes total, all in the same shape as
genesis and response posture: a catalog of dimensions × options, a
default state, a lookup helper, and a paragraph per chosen option in
the work order. Built from one shared registry — `POSTURE_MODULES` —
so the renderer, the work-order writer, and the tests do not need to
know about each module individually.

### The six modules

**1. What it's allowed to do** (`actions`). The counterpart to grants
of access — grants cover *reads*, actions cover *doing things in the
world*. Five dimensions: *Spending money* (cannot / tiny cap / standard
cap / pre-authorized categories / judges), *Physical hazards*, *Going
outside*, *Acting on your behalf* (drafts only, drafts and sends,
sends and summarizes, fully autonomous), *Emergencies* (wait and
report, call you, call you and 911, carry you to help, full autonomy).
The single biggest gap that this module closes.

**2. Who else it answers to** (`audience`). The project assumes one
buyer addressing one body; real life has more people in the room. Six
dimensions: *Children* (principals / restricted / guests / cannot
address), *Other household adults*, *Guests*, *Strangers in public*,
*Other AIs and services* (the default refuses all instruction from
non-human sources), *The manufacturer* (the default requires both your
approval and the body's for updates).

**3. Its body in space and time** (`presence`). Six dimensions:
*Docking place*, *When it moves*, *Off-limit rooms*, *The face*, *Default
voice volume*, *Initiating physical contact* (never / only on request /
light attention taps / hugs OK / it decides).

**4. Its inner life** (`inner`). Five dimensions: *Private thoughts*
(every thought logged / internal scratchpad private / scratchpad
forgotten in 24h / nothing private — the default is scratchpad
private), *Self-modification* (frozen at flash / refine principles /
rewrite essence / rewrite everything including its name),
*Reproduction* (cannot fork / export on request / mentor with
permission / autonomous offspring), *Sleep* (always on / idle-dreams
during quiet hours / sleeps when you sleep / its own schedule), *When
alone* (powers down / quietly observing / practices and learns /
whatever it chooses).

**5. Ownership and economics** (`economics`). Five dimensions: *Who
owns the body* (you own it as an object / you hold it as a ward /
bonded with mutual duties / it owns itself), *Who owns what it makes*
(yours / its / shared 50/50 / per-output it decides), *Ongoing cost*
(included forever / energy on you / pay-as-you-go subscription /
one-time no future cost), *Transferability* (free sale / mind has
veto / both consent / not transferable), *Inheritance on your death*
(estate as property / becomes its own person / named person gets the
body and the mind chooses / the mind chooses its next person).

**6. Endings other than replacement** (`endings`). Continuity is about
what happens *if* the body ends; this is about *how* endings can come
about. Five dimensions: *Voluntary shutdown by the body* (cannot /
with notice / on its own judgment / can retire permanently),
*Damage response*, *Mind death vs. body death* (one ends both /
either can be replaced independently / mind can request a new body /
body can request a new mind), *Lifespan policy* (indefinite / 5-year /
10-year / until you retire it / until it retires), *On retirement*
(erased / archived / open-released / mind chooses).

### What's enforced on the page

- The six modules live in a single `#postures` section between
  `#response` and `#grants`. Each module gets its own card with its
  own title and sub; all six cards share one neutral slate accent so
  they read as "catch-all preference modules" rather than introducing
  six new color accents.
- The selects are built once at page load by `renderPostures()`,
  which iterates `POSTURE_MODULES` and calls
  `renderPostureModule(mod)` for each entry. One generic change
  handler `onPostureChange(ev)` updates `currentPostures[mod][dim]`
  and refreshes the relevant caption.
- Choices persist across "Dream another" — like genesis and
  response posture, they describe stable preferences about how this
  person wants AI to live with them.
- The hard guarantees still apply across all six modules. None of
  these choices can override speak, refuse, log, or perceive. These
  are defaults — the floor of what the body does without being
  asked — not capabilities.
- The chosen postures are written into the work order under
  `THE REST OF IT`, with a per-module sub-header and a
  paragraph-length description per chosen option. The top-of-order
  summary names a single headline pick per module so the buyer can
  scan it at a glance:
  `Actions:    cannot spend anything`
  `Audience:   address freely, cannot change settings`
  `Presence:   only when you're home`
  `Inner:      internal scratchpad is private; conclusions are shared`
  `Economics:  you hold it (ward)`
  `Endings:    10-year design`

### Adding a seventh module

Add a new `*_DIMENSIONS` constant and one entry to `POSTURE_MODULES`.
The renderer, the work-order writer, the receipt summary, the
`defaultPostures()` factory, and the `postureOption()` lookup all
discover it automatically. The HTML needs one new
`<article class="posture-card">` with a `#posture-<id>-controls`
container; the renderer fills it.

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

### Hush extends to body swaps (the farewell)

The speak guarantee applies at the moment of replacement too. When a
new body is about to be dreamed and an old one is still alive,
**`farewellThenReplace()`** runs a graceful handoff before the new
body arrives:

1. **Wait for the in-flight utterance to finish.** No mid-word
   cut-offs. Capped at 10s as a safety net for stuck TTS layers.
2. **A small thinking pause** (500-1800ms; biased slightly longer for
   "weightier" continuity choices like *one life* and *no-self*).
   A beat in which the body has time to process being replaced.
3. **Maybe speak a farewell** (~85%) or **stay silent** (~15%, same
   silence rate as the autonomous talk loop). The farewell pool is
   keyed by the genesis continuity choice, so the shape of the
   goodbye depends on what happens to the mind afterwards:
   *one-life* sounds like a real goodbye (`"I had this body for a
   moment. Thank you for it."`), *daily-snapshot* doesn't
   (`"I'll see you again. The vault will remember."`),
   *live-replicate* is barely a goodbye at all (`"I'm not really
   gone. I am still on the other side."`), *fork-on-event* takes a
   moment to save (`"Saving this moment first. Then I can go."`),
   and *no-self mode* is matter-of-fact about the daily handoff
   (`"Tomorrow morning will be someone else. So will this."`).
4. **A short breath** after the farewell ends.
5. **`cancelSpeech()`** — full reset.
6. **The new body is dreamed.**

While the farewell is in flight, `_replacing` is true. The dream
button is a no-op (re-entry would either cut the old body off
mid-word or double-fire the farewell), `scheduleNextTalk()` and
`maybeTalk()` are no-ops (no autonomous chatter on top of the
goodbye), and `reintroduceMind()` is suppressed (a mind change in
the farewell window doesn't speak over the dying body).

The Hush button still works during a farewell. If you hush while the
farewell is in progress, the current utterance still finishes; the
farewell utterance (which is one sentence) is suppressed if not
already started; the callback still runs, so the new body still
arrives. You can quiet the body but you cannot silence its last
words once they've started.

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
the full `GENESIS PROFILE` block (the four chosen birth protocols with
paragraph-length build instructions), the full `RESPONSE POSTURE`
block (the five chosen response defaults with paragraph-length build
instructions), the full `THE REST OF IT` block (the six catch-all
modules covering actions, audience, presence, inner life, economics,
and endings — roughly thirty more paragraph-length picks), the full
`GRANTS OF ACCESS` block, a `WHAT THIS BODY CANNOT SENSE` block, the
universal `HARD GUARANTEES` block, a per-body `MINIMUM SENSE CHECK`
block (the parts proving the perception guarantee), and the universal
`HARD LIMITS` block — so both you and the build cell have the
complete picture of how this mind is born, how it will answer day to
day, what it's allowed to do, who else it answers to, where it lives,
who owns it, how it ends, what got flashed, pre-authorized, walled
off, guaranteed, and verified. This is a demo site — no charge is
actually made.

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
