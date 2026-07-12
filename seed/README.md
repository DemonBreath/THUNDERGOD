# SEED

**Start from one QR. Grow an infinite cloud of them.**

Not one QR forever — a **genesis** QR. Every export archives another layer
in the infinite cloud. The mind recalls knowledge from its whole QR history.

## Run

```bash
cd seed
python3 -m http.server 8001
# open http://localhost:8001/
```

## The loop

1. **Forge** — genesis QR (layer #0) enters the infinite cloud
2. **Wake** — scan any QR from the mind's line
3. **Teach** — file facts in conversation
4. **Export** — new QR becomes the next cloud layer; mind draws on all layers

## Infinite cloud

- `infinite-cloud.js` — archives every QR payload locally (unbounded history per mind line)
- Each mind has a `line` id — all its QRs share one cloud
- Recall searches across **every archived QR**, not just the current one
- Ask: `qr history` or `what do you know`

## Teach it

```
remember that my name is Alex
teach: choice :: the most important thing
what do you know
qr history
```

## Schema addition

```json
{
  "line": "uuid-for-this-mind-line",
  "gen": 2,
  "knowledge": [ ... ]
}
```

Genesis QR starts at `gen: 0`. Each export increments and archives.

Built for choice first — one beginning, infinite memory.
