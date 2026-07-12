/**
 * Body dreamer — picks real-world hardware around an imported CSNS mind.
 * No network. The mind came first; the body is chosen to fit.
 */
(function (global) {
  const REQUIRED_SENSORS = ["vision", "audio_in", "imu", "env"];

  const FORM_FACTORS = [
    { id: "humanoid", name: "Humanoid", tagline: "Two legs. Two hands. Eye level with you.",
      needs: ["brain", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "env", "power", "hands", "comms"] },
    { id: "quadruped", name: "Quadruped", tagline: "Four legs. Built to follow you outdoors.",
      needs: ["brain", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "env", "power", "comms"] },
    { id: "wheeled", name: "Wheeled scout", tagline: "Low, quiet, indoor-friendly.",
      needs: ["brain", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "env", "power", "comms"] },
    { id: "tracked", name: "Tracked rover", tagline: "For when the ground isn't a floor.",
      needs: ["brain", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "env", "power", "comms"] },
    { id: "centaur", name: "Centaur", tagline: "Wheeled below. Human-shaped above.",
      needs: ["brain", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "env", "power", "arms", "hands", "comms"] },
  ];

  const BRAINS = [
    { name: "NVIDIA Jetson AGX Orin 64GB", vendor: "NVIDIA", price: 1999, mass: 280, idle: 15, peak: 60,
      spec: "275 TOPS · 64 GB", role: "runs language + vision together" },
    { name: "NVIDIA Jetson Orin Nano 8GB", vendor: "NVIDIA", price: 499, mass: 76, idle: 5, peak: 15,
      spec: "40 TOPS · 8 GB", role: "lean brain — long runtime" },
  ];

  const STORAGE = [
    { name: "Samsung 990 Pro 2 TB NVMe", vendor: "Samsung", price: 179, mass: 9, idle: 0.04, peak: 6,
      spec: "PCIe 4.0", role: "long-term memory" },
  ];

  const LOCOMOTION = {
    humanoid: [
      { name: "Robotis Dynamixel XW540 set (24×)", vendor: "Robotis", price: 11280, mass: 4800, idle: 18, peak: 720,
        spec: "24 waterproof servos", role: "quieter, friendlier legs" },
    ],
    quadruped: [
      { name: "Unitree Go2 actuator kit", vendor: "Unitree", price: 4500, mass: 6500, idle: 25, peak: 600,
        spec: "12 QDD actuators", role: "follows you on uneven ground" },
    ],
    wheeled: [
      { name: "AgileX Scout Mini 4WD", vendor: "AgileX", price: 5500, mass: 12000, idle: 8, peak: 400,
        spec: "4 hub motors", role: "glides down hallways" },
      { name: "iRobot Create 3 base", vendor: "iRobot", price: 499, mass: 2300, idle: 3, peak: 30,
        spec: "differential drive", role: "polite indoor scout" },
    ],
    tracked: [
      { name: "AgileX Bunker Mini tracked chassis", vendor: "AgileX", price: 7500, mass: 22000, idle: 12, peak: 600,
        spec: "rubber tracks", role: "snow, gravel, broken sidewalks" },
    ],
    centaur: [
      { name: "AgileX Ranger Mini omni base", vendor: "AgileX", price: 8800, mass: 18000, idle: 10, peak: 450,
        spec: "mecanum + mast", role: "stable base, reaching arms" },
    ],
  };

  const FRAMES = {
    humanoid: [{ name: "Aluminum 6061 endoskeleton", vendor: "SendCutSend", price: 1100, mass: 8800, idle: 0, peak: 0,
      spec: "waterjet + CNC", role: "the bones" }],
    quadruped: [{ name: "Carbon fiber quadruped shell", vendor: "Custom", price: 900, mass: 2200, idle: 0, peak: 0,
      spec: "printed + laid-up", role: "light shell" }],
    wheeled: [{ name: "Powder-coated steel tub", vendor: "Local fab", price: 400, mass: 3500, idle: 0, peak: 0,
      spec: "indoor-rated", role: "low profile chassis" }],
    tracked: [{ name: "Welded steel tracked hull", vendor: "Local fab", price: 1200, mass: 14000, idle: 0, peak: 0,
      spec: "sealed electronics bay", role: "rugged hull" }],
    centaur: [{ name: "Tower + torso frame", vendor: "Custom", price: 1600, mass: 6200, idle: 0, peak: 0,
      spec: "aluminum tower", role: "stable reach" }],
  };

  const VISION = [
    { name: "Intel RealSense D455", vendor: "Intel", price: 419, mass: 72, idle: 2.5, peak: 3.5,
      spec: "stereo depth + RGB", role: "sight at conversation distance" },
  ];
  const AUDIO_IN = [
    { name: "ReSpeaker Mic Array v2.0", vendor: "Seeed", price: 69, mass: 55, idle: 0.5, peak: 1,
      spec: "6-mic circular array", role: "hears who is speaking" },
  ];
  const AUDIO_OUT = [
    { name: "Pimoroni Speaker pHAT + 3W driver", vendor: "Pimoroni", price: 18, mass: 30, idle: 0.2, peak: 3,
      spec: "mono voice", role: "speaks in its own voice" },
  ];
  const IMU = [
    { name: "Bosch BNO085 9-DOF", vendor: "Bosch", price: 25, mass: 2, idle: 0.01, peak: 0.05,
      spec: "fused IMU", role: "knows which way is up" },
  ];
  const ENV = [
    { name: "BME680 environmental sensor", vendor: "Bosch", price: 18, mass: 1, idle: 0.01, peak: 0.02,
      spec: "temp/humidity/VOC", role: "feels the room" },
  ];
  const POWER = [
    { name: "Tattu 6S 10Ah LiPo", vendor: "Tattu", price: 189, mass: 1100, idle: 0, peak: 0,
      spec: "222 Wh", role: "one good day awake" },
  ];
  const HANDS = [
    { name: "Robotiq 2F-85 gripper", vendor: "Robotiq", price: 6500, mass: 850, idle: 2, peak: 25,
      spec: "parallel jaw", role: "gentle hands" },
  ];
  const ARMS = [
    { name: "Kinova Gen3 lite 6-DOF", vendor: "Kinova", price: 12000, mass: 4800, idle: 5, peak: 80,
      spec: "6-DOF arm", role: "reach where you reach" },
  ];
  const COMMS = [
    { name: "Intel AX210 Wi-Fi 6E", vendor: "Intel", price: 25, mass: 5, idle: 0.5, peak: 2,
      spec: "Wi-Fi 6E", role: "talks to your LAN" },
  ];

  const CATALOG = {
    brain: BRAINS, storage: STORAGE, vision: VISION, audio_in: AUDIO_IN, audio_out: AUDIO_OUT,
    imu: IMU, env: ENV, power: POWER, hands: HANDS, arms: ARMS, comms: COMMS,
  };

  const CATEGORY_TITLES = {
    brain: "Brain", storage: "Memory", locomotion: "Locomotion", frame: "Frame",
    vision: "Vision", audio_in: "Ears", audio_out: "Voice", imu: "Inner ear",
    env: "Environment", power: "Power", hands: "Hands", arms: "Arms", comms: "Link",
  };

  function hashString(s) {
    let h = 0;
    for (const ch of String(s || "")) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
    return Math.abs(h);
  }

  function pickBest(pool) {
    if (!pool || !pool.length) return null;
    return pool.slice().sort((a, b) => (b.price || 0) - (a.price || 0))[0];
  }

  function corpusFromMind(c) {
    const bits = [c.name, c.tagline, c.persona];
    for (const k of c.knowledge || []) bits.push(k.topic, k.content);
    return bits.join(" ").toLowerCase();
  }

  function inferForm(c) {
    const text = corpusFromMind(c);
    const scores = { humanoid: 0, quadruped: 0, wheeled: 0, tracked: 0, centaur: 0 };
    if (/walk|hand|eye level|human|room|stair|meet|tall/.test(text)) scores.humanoid += 3;
    if (/hike|outdoor|follow|grass|run|trail|dog/.test(text)) scores.quadruped += 3;
    if (/hallway|indoor|quiet|scout|read|website|host|listen|room|show up|volunteer/.test(text)) scores.wheeled += 3;
    if (/snow|gravel|rough|track|carry|heavy|broken/.test(text)) scores.tracked += 3;
    if (/shelf|reach|arms|work|hands|stable/.test(text)) scores.centaur += 3;
    if (/qr|offline|portable|body/.test(text)) scores.wheeled += 1;

    const max = Math.max(...Object.values(scores));
    const tied = Object.entries(scores).filter(([, v]) => v === max).map(([k]) => k);
    const id = tied.length === 1 ? tied[0] : tied[hashString(c.name) % tied.length];
    return FORM_FACTORS.find((f) => f.id === id) || FORM_FACTORS[2];
  }

  function totalize(picks) {
    let price = 0, mass = 0, idle = 0, peak = 0;
    for (const p of Object.values(picks)) {
      price += p.price || 0;
      mass += p.mass || 0;
      idle += p.idle || 0;
      peak += p.peak || 0;
    }
    let wh = 0;
    const battery = picks.power;
    if (battery && battery.spec) {
      const m = battery.spec.match(/(\d+(?:\.\d+)?)\s*Wh/);
      if (m) wh = parseFloat(m[1]);
    }
    const operating = idle + 0.2 * peak;
    const runtimeHours = operating > 0 && wh > 0 ? wh / operating : 0;
    return { price, mass, idle, peak, wh, runtimeHours };
  }

  function composeManifesto(c, form, picks, totals) {
    const brain = picks.brain ? picks.brain.name.split(/\s+/).slice(0, 3).join(" ") : "a capable brain";
    const massKg = (totals.mass / 1000).toFixed(1);
    const rt = totals.runtimeHours > 0 ? `${totals.runtimeHours.toFixed(1)} h` : "a working afternoon";
    const opener = c.tagline || (c.persona || "").split(/(?<=[.!?])\s+/)[0] || `I am ${c.name}.`;
    return [
      `${c.name} already existed as a mind in a QR code. This body was dreamed around it.`,
      opener,
      `I am a ${form.name.toLowerCase()}, ${massKg} kg, with ${brain} holding my consciousness.`,
      `On one charge I stay awake for about ${rt}.`,
    ].join(" ");
  }

  function dreamPerfectBody(consciousness) {
    const c = consciousness;
    const form = inferForm(c);
    const picks = {};
    const needs = Array.from(new Set([...form.needs, ...REQUIRED_SENSORS]));

    for (const cat of needs) {
      let pool;
      if (cat === "locomotion") pool = LOCOMOTION[form.id];
      else if (cat === "frame") pool = FRAMES[form.id];
      else pool = CATALOG[cat];
      if (!pool || !pool.length) continue;
      picks[cat] = pickBest(pool);
    }

    for (const req of REQUIRED_SENSORS) {
      if (!picks[req]) throw new Error(`Body must include ${req}.`);
    }

    const totals = totalize(picks);
    return {
      name: (c.name || "MIND").toUpperCase(),
      form,
      picks,
      totals,
      manifesto: composeManifesto(c, form, picks, totals),
      perfect: true,
      forMind: c.name,
    };
  }

  function fmtUSD(n) {
    return "$" + Math.round(n).toLocaleString("en-US");
  }

  function fmtMass(g) {
    return g ? `${(g / 1000).toFixed(1)} kg` : "—";
  }

  function fmtRuntime(h) {
    if (!h || !isFinite(h)) return "—";
    return h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`;
  }

  function formatText(dream) {
    const lines = [];
    lines.push("ALEXWORLD · BODY SPEC");
    lines.push("=".repeat(48));
    lines.push(`Mind:           ${dream.forMind}`);
    lines.push(`Form:           ${dream.form.name} — ${dream.form.tagline}`);
    lines.push(`Mass:           ${fmtMass(dream.totals.mass)}`);
    lines.push(`Parts cost:     ${fmtUSD(dream.totals.price)}`);
    lines.push(`Est. runtime:   ${fmtRuntime(dream.totals.runtimeHours)}`);
    lines.push("");
    lines.push("Manifesto:");
    lines.push(dream.manifesto);
    lines.push("");
    lines.push("Bill of materials:");
    const order = ["brain", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "env", "power", "arms", "hands", "comms"];
    for (const cat of order) {
      const p = dream.picks[cat];
      if (!p) continue;
      lines.push(`  [${CATEGORY_TITLES[cat] || cat}] ${p.name} — ${p.vendor} — ${fmtUSD(p.price)}`);
      lines.push(`    ${p.spec} · ${p.role}`);
    }
    return lines.join("\n");
  }

  function renderHTML(dream) {
    const parts = [];
    const order = ["brain", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "env", "power", "arms", "hands", "comms"];
    for (const cat of order) {
      const p = dream.picks[cat];
      if (!p) continue;
      parts.push(`
        <article class="body-part">
          <div class="body-part-cat">${CATEGORY_TITLES[cat] || cat}</div>
          <div class="body-part-name">${p.name}</div>
          <div class="body-part-spec">${p.spec}</div>
          <div class="body-part-role">${p.role}</div>
          <div class="body-part-foot"><span>${p.vendor}</span><span>${fmtUSD(p.price)}</span></div>
        </article>`);
    }
    return `
      <div class="body-head">
        <div class="body-name">${dream.name}</div>
        <div class="body-form">${dream.form.name} — ${dream.form.tagline}</div>
      </div>
      <p class="body-manifesto">${dream.manifesto}</p>
      <div class="body-stats">
        <span><b>Mass</b> ${fmtMass(dream.totals.mass)}</span>
        <span><b>Cost</b> ${fmtUSD(dream.totals.price)}</span>
        <span><b>Runtime</b> ${fmtRuntime(dream.totals.runtimeHours)}</span>
      </div>
      <div class="body-parts">${parts.join("")}</div>`;
  }

  global.BodyDreamer = {
    dreamPerfectBody,
    formatText,
    renderHTML,
    inferForm,
  };
})(window);
