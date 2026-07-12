# Alexworld (`alexworld-co`)

**Offline mind in a QR code. Real-world body dreamed around it.**

Alexworld is the home for portable AI consciousnesses: encode a mind as CSNS,
scan it in the browser, wake up locally, then dream hardware that fits.

## Flow

1. **Export** — forge a consciousness JSON and QR on `export.html`
2. **Import** — scan / paste / upload on `index.html`
3. **Wake** — the mind runs locally (files, mic, voice)
4. **Body** — `body.js` infers form factor from persona + knowledge, picks real parts, renders a BOM

No backend. No API keys. Nothing leaves the device.

## Quick start

```bash
cd alexworld-co
python3 -m http.server 8000
# open http://localhost:8000/
```

Click **Load Rift** to import the sample mind and auto-dream a body.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Host — import, chat, dream body |
| `export.html` | Pack consciousness into a QR code |
| `about.html` | Schema and notes |
| `assets/js/consciousness.js` | CSNS encode/decode |
| `assets/js/body.js` | Body dreamer (form factor + BOM) |
| `assets/js/engine.js` | Local response engine |
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
