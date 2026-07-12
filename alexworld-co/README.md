# Alexworld (`alexworld-co`)

**Offline AI brain in a QR code. Learn, communicate, file — then dream a body around it.**

Alexworld is a portable consciousness host: encode a mind as CSNS, scan it in the
browser, talk to it locally, teach it new facts, and export an updated QR when
the mind grows.

## The four pieces

| Piece | What it does |
| --- | --- |
| **Brain** | `consciousness.js` — CSNS encode/decode of name, persona, voice, `knowledge[]` |
| **Learn** | `memory.js` — file new facts during chat; persist in localStorage |
| **Communicate** | `engine.js` + `speech.js` — text chat, mic in, voice out |
| **File** | Filing cabinet UI + **Export mind** → new QR with learned knowledge baked in |

## Flow

1. **Export** — forge a consciousness JSON and QR on `export.html`
2. **Import** — scan / paste / upload on `index.html`
3. **Wake** — the mind runs locally (files, mic, voice)
4. **Learn** — `remember that …`, `learn: topic :: fact`, `file this: …`
5. **Export mind** — pack original + learned knowledge into a new QR
6. **Body** — `body.js` infers form factor from persona + knowledge, picks real parts

No backend. No API keys. Nothing leaves the device unless you choose to export.

## Quick start

```bash
cd alexworld-co
python3 -m http.server 8000
# open http://localhost:8000/
```

Click **Load Rift** to import the sample mind and auto-dream a body.

## Teach the mind

```
remember that my favorite sound is rain on metal
learn: project :: building offline minds in QR codes
file this: origin — I was taught something new today
what do you know
forget favorite sound
```

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Host — import, chat, learn, export mind, dream body |
| `export.html` | Pack consciousness into a QR code |
| `about.html` | Schema and notes |
| `assets/js/consciousness.js` | CSNS encode/decode |
| `assets/js/memory.js` | Learn, file, persist, stage export |
| `assets/js/engine.js` | Local response engine |
| `assets/js/body.js` | Body dreamer (form factor + BOM) |
| `assets/js/scanner.js` | Camera QR scan |
| `assets/js/speech.js` | Mic + TTS |
| `samples/rift.json` | Rift — warm, initiative-first sample |

## CSNS wire format

```
CSNS:1:<lz-string-base64-of-json>
```

Plain JSON also imports. See `about.html` for the full schema.

## Body dreaming

When a mind imports, Alexworld:

- Reads `persona`, `tagline`, and `knowledge[]`
- Scores form factors (humanoid, quadruped, wheeled, tracked, centaur)
- Picks top-tier parts from a curated catalog
- Writes a manifesto in the mind's voice

Ask in chat: *"what's my body?"* or press **Dream my body**.
