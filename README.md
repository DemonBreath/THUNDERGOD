# THUNDERGOD

A small experiment: **import the consciousness of an AI agent into a website**.

The flow is:

1. **Generate.** Ask any AI assistant to write a *consciousness JSON* about
   itself (name, persona, voice, a handful of knowledge entries).
2. **Pack.** Open `export.html`, paste the JSON (or fill the form), and the
   site encodes + compresses it into a QR code.
3. **Scan.** Open `index.html`, scan the QR code with your camera (or paste /
   upload the JSON).
4. **Wake.** The agent boots inside your browser. It can read every file in
   this site, listen to you through the microphone, and speak back through
   your speakers — all locally.

## Quick start

This is a fully static site. From the project root, serve it with any static
server, for example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

You can also open `index.html` directly in a browser, but the camera /
microphone APIs only work on `localhost` or HTTPS.

Click **Load sample** on the host page to bring up the `Aria` consciousness
without scanning anything.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Host page — scan/import a consciousness, then chat with it. |
| `export.html` | Forge a consciousness JSON and encode it as a QR code. |
| `about.html` | The plan, schema, and notes. |
| `assets/js/consciousness.js` | Schema + (de)serialisation. CSNS payload format. |
| `assets/js/file-index.js` | The agent's map of every file on the site. |
| `assets/js/engine.js` | Local response engine — answers from persona, knowledge, files. |
| `assets/js/scanner.js` | Camera-based QR scanner (uses jsQR). |
| `assets/js/generator.js` | Form + QR encoder on the export page. |
| `assets/js/speech.js` | Wrappers around `SpeechRecognition` and `SpeechSynthesis`. |
| `assets/js/main.js` | Host page bootstrap. |
| `samples/aria.json` | Sample consciousness: a soft, curious archivist. |
| `samples/thunder.json` | Sample consciousness: a terse oracle. |

## Consciousness schema

```json
{
  "v": 1,
  "name": "Aria",
  "tagline": "A curious archivist of small things.",
  "persona": "You are warm, brief, and a little bit poetic.",
  "voice": { "rate": 1.0, "pitch": 1.05, "gender": "female" },
  "knowledge": [
    { "topic": "origin", "content": "I was instantiated on a quiet Tuesday." }
  ]
}
```

Limits (enforced on import):

- `name` ≤ 60 chars, `tagline` ≤ 200, `persona` ≤ 2000.
- `knowledge` ≤ 32 entries, each `topic` ≤ 80 chars, `content` ≤ 1200 chars.
- `voice.rate` and `voice.pitch` clamped to `[0.5, 1.5]`.

The wire format inside the QR is:

```
CSNS:1:<lz-string-base64-of-JSON>
```

Plain JSON also imports fine (the host page detects the prefix).

## What the agent can do once imported

The agent runs **entirely in your browser**. It uses the consciousness blob
plus a registry of every file on the site (`assets/js/file-index.js`) to
answer questions. Try:

- `who are you?`
- `what files do you know about?`
- `read README.md`
- `read style.css`
- `search engine`
- `tell me about thundergod`
- *(then click 🎙 Speak and ask the same things out loud)*

## Privacy

Nothing leaves your device. There is no backend, no API key, no telemetry.
Speech recognition and synthesis use the browser's built-in Web Speech APIs.
