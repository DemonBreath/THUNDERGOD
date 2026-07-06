#!/usr/bin/env node
/* QR brain → perfect body integration tests */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function stubDom() {
  const els = {};
  const makeEl = (id) => ({
    id,
    hidden: true,
    textContent: "",
    innerHTML: "",
    value: "",
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    scrollIntoView() {},
    files: null,
  });
  global.document = {
    readyState: "complete",
    querySelector(sel) {
      const m = sel.match(/#([\w-]+)/);
      if (m) {
        if (!els[m[1]]) els[m[1]] = makeEl(m[1]);
        return els[m[1]];
      }
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() { return { appendChild() {}, click() {} }; },
  };
  global.window = global;
  global.navigator = { clipboard: null };
  global.SpeechSynthesisUtterance = function () {};
  global.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [] };
}

function loadScript(rel) {
  const code = fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  vm.runInThisContext(code, { filename: rel });
}

stubDom();
global.__THUNDERGOD_SKIP_INIT = true;
loadScript("assets/consciousness.js");
loadScript("assets/dream.js");

const {
  csnsToMind,
  mapCsnsVoice,
  importCsnsPayload,
  inferFormForMind,
  dreamPerfectBodyForMind,
  buildWorkOrder,
  defaultGenesis,
  defaultResponse,
  defaultPostures,
  defaultGrantState,
  RIFT_SAMPLE_CSNS,
} = globalThis.__THUNDERGOD;

let failed = 0;
function ok(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); failed++; return; }
  console.log("ok:", msg);
}

const riftMind = csnsToMind(RIFT_SAMPLE_CSNS);
ok(riftMind.name === "Rift", "csnsToMind name");
ok(riftMind.source === "qr", "csnsToMind source qr");
ok(riftMind.voice === "warm", "csnsToMind voice maps warm");
ok(riftMind.essence.includes("Warm when"), "csnsToMind essence has tagline");
ok(riftMind.memories.length === 3, "csnsToMind memories from knowledge");
ok(riftMind.principles.length >= 1, "csnsToMind principles from persona");

ok(mapCsnsVoice({ rate: 0.95, pitch: 0.75 }) === "dry", "mapCsnsVoice dry");
ok(mapCsnsVoice("calm") === "calm", "mapCsnsVoice string passthrough");

const encoded = Consciousness.encode(RIFT_SAMPLE_CSNS);
ok(encoded.startsWith("CSNS:1:"), "CSNS encode prefix");
const decoded = importCsnsPayload(encoded);
ok(decoded.ok && decoded.mind.name === "Rift", "importCsnsPayload round-trip");

const form = inferFormForMind(riftMind);
ok(form && form.id, "inferFormForMind returns form");
ok(["wheeled", "humanoid", "centaur", "quadruped", "tracked"].includes(form.id), "inferFormForMind valid id");

const dream = dreamPerfectBodyForMind(riftMind);
ok(dream.perfect === true, "dream.perfect flag");
ok(dream.name === "RIFT", "dream uses mind name");
ok(dream.picks.brain, "dream has brain");
ok(dream.picks.vision && dream.picks.audio_in && dream.picks.imu && dream.picks.env, "dream has required sensors");

const { priceOrder } = globalThis.__THUNDERGOD;
const price = priceOrder(dream.totals, "full-build");
const wo = buildWorkOrder(
  dream,
  riftMind,
  defaultGrantState(),
  { orderId: "TG-TEST", recipient: "Test", email: "t@t.com", street: "1", unit: "", city: "X", region: "", postal: "0", country: "US", notes: "" },
  "full-build",
  price,
  defaultGenesis(),
  defaultResponse(),
  defaultPostures()
);
ok(wo.includes("QR brain (CSNS)"), "work order CSNS source label");
ok(wo.includes("dreamed around Rift"), "work order perfect body line");

console.log(failed ? `\n${failed} failed` : "\nAll QR brain tests passed.");
process.exit(failed ? 1 : 0);
