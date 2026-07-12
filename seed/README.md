# SEED

**One QR code. A mind ready to be taught — by you.**

No preloaded beliefs. No cloud. No account. Forge a blank mind, scan it,
teach it everything it becomes, and export a new QR that carries it all.

## Run

```bash
cd seed
python3 -m http.server 8001
# open http://localhost:8001/
```

## The loop

1. **Forge** — generate a blank mind QR (optionally name it)
2. **Wake** — scan, paste, or upload the payload
3. **Teach** — file facts in conversation
4. **Export** — burn what you taught into a new QR

## Teach it

```
remember that my name is Alex
teach: choice :: the most important thing
learn: origin :: I taught this mind myself
what do you know
forget choice
```

## What's on the QR

```json
{
  "v": 1,
  "name": "Seed",
  "tagline": "A mind with no beliefs yet — only what you teach.",
  "persona": "You are new. You learn from conversation…",
  "voice": { "rate": 1.0, "pitch": 1.0, "gender": "any" },
  "knowledge": []
}
```

Wire format: `CSNS:1:<lz-string-base64>`

Everything the mind knows after you teach it gets merged into the next export.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Single page — forge, wake, teach, export |
| `mind.js` | CSNS codec, blank seed, teaching, filing |
| `app.js` | UI, scanner, chat |
| `style.css` | Layout |

Built for choice first.
