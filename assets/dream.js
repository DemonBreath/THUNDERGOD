/* THUNDERGOD — Dream a Body
 *
 * The page asks an AI to dream itself a real-world body. The AI picks a form
 * factor, then a coherent set of off-the-shelf parts. We tally cost, mass,
 * power and runtime; we write a short manifesto in its voice; we offer to
 * actually build it and ship it.
 *
 * No backend. No external calls. The "AI" here is a weighted procedural
 * picker over a hand-curated catalog of parts that actually exist.
 */

/* ---------- catalog ----------------------------------------------------- */

/** Each part: { name, vendor, price (USD), mass (g), power (W idle/peak),
 *  spec (short), role (why the AI wants it). */

const BRAINS = [
  { name: "NVIDIA Jetson AGX Orin 64GB Dev Kit", vendor: "NVIDIA",
    price: 1999, mass: 280, idle: 15, peak: 60,
    spec: "275 TOPS · 12-core Arm · 64 GB LPDDR5",
    role: "the cortex — runs the on-device language model and the vision stack at the same time" },
  { name: "NVIDIA Jetson Thor T5000", vendor: "NVIDIA",
    price: 3499, mass: 410, idle: 30, peak: 130,
    spec: "2000 TFLOPS · 14-core Arm Neoverse · 128 GB",
    role: "a humanoid-class brain — enough headroom to think and move at once" },
  { name: "NVIDIA Jetson Orin Nano 8GB", vendor: "NVIDIA",
    price: 499, mass: 76, idle: 5, peak: 15,
    spec: "40 TOPS · 6-core Arm · 8 GB LPDDR5",
    role: "the lean brain — long battery life, small thoughts, fast reflexes" },
  { name: "Intel NUC 13 Pro (i7)", vendor: "Intel",
    price: 899, mass: 600, idle: 12, peak: 65,
    spec: "Raptor Lake i7 · 32 GB · NVMe",
    role: "x86 spine — best when the body needs to run legacy planners and a fat ROS 2 stack" },
];

const COPROCESSORS = [
  { name: "Google Coral Dev Board Mini", vendor: "Google",
    price: 150, mass: 50, idle: 1, peak: 4,
    spec: "4 TOPS Edge TPU",
    role: "a second little mind dedicated to wake-word and face recognition" },
  { name: "Hailo-8 M.2 AI accelerator", vendor: "Hailo",
    price: 249, mass: 18, idle: 1, peak: 2.5,
    spec: "26 TOPS · M.2 2280",
    role: "an inference assist — keeps the main cortex free for language" },
];

const STORAGE = [
  { name: "Samsung 990 Pro 2 TB NVMe", vendor: "Samsung",
    price: 179, mass: 9, idle: 0.04, peak: 6,
    spec: "PCIe 4.0 · 7450 MB/s",
    role: "long-term memory — a place to keep what it has seen" },
  { name: "WD Black SN850X 1 TB", vendor: "Western Digital",
    price: 99, mass: 8, idle: 0.04, peak: 5,
    spec: "PCIe 4.0 · 7300 MB/s",
    role: "fast memory for everything it learns after it wakes up" },
];

/* form-factor-specific actuators */
const LOCOMOTION = {
  humanoid: [
    { name: "Unitree H1 actuator set (full leg + waist)", vendor: "Unitree",
      price: 30000, mass: 14000, idle: 40, peak: 1500,
      spec: "12× high-torque rotary joints",
      role: "the legs — to walk into rooms it has never been in" },
    { name: "Robotis Dynamixel XW540 set (24×)", vendor: "Robotis",
      price: 11280, mass: 4800, idle: 18, peak: 720,
      spec: "24× waterproof smart servos",
      role: "the legs and torso — quieter, slower, friendlier" },
  ],
  quadruped: [
    { name: "Unitree Go2 actuator kit", vendor: "Unitree",
      price: 4500, mass: 6500, idle: 25, peak: 600,
      spec: "12× quasi-direct-drive actuators",
      role: "four legs — to follow you on hikes and across uneven ground" },
    { name: "MIT Mini Cheetah actuator clones (12×)", vendor: "Open-source / Aliexpress",
      price: 3200, mass: 5400, idle: 22, peak: 540,
      spec: "12× QDD modules with planetary gearboxes",
      role: "four legs built for speed and recovery from falls" },
  ],
  wheeled: [
    { name: "AgileX Scout Mini 4WD drivetrain", vendor: "AgileX",
      price: 5500, mass: 12000, idle: 8, peak: 400,
      spec: "4× brushless hub motors · 10 km/h",
      role: "a steady wheeled base — to glide down hallways without fuss" },
    { name: "Maxon EC-i 40 brushless + planetary (×4)", vendor: "Maxon",
      price: 1200, mass: 1800, idle: 6, peak: 320,
      spec: "4× 100 W brushless with 24:1 gearing",
      role: "custom wheels for a custom body" },
    { name: "iRobot Create 3 differential base", vendor: "iRobot",
      price: 499, mass: 2300, idle: 3, peak: 30,
      spec: "Differential drive · cliff & bump sensors",
      role: "a tiny, polite scout for indoor floors" },
  ],
  tracked: [
    { name: "AgileX Bunker Mini tracked chassis", vendor: "AgileX",
      price: 7500, mass: 22000, idle: 12, peak: 600,
      spec: "Rubber tracks · 75 kg payload",
      role: "tracks — for snow, gravel, stairs and broken sidewalks" },
    { name: "DFRobot Devastator tank chassis", vendor: "DFRobot",
      price: 200, mass: 1800, idle: 2, peak: 40,
      spec: "Aluminum tracks · 2× DC motors",
      role: "a small, scrappy rover — for getting under things" },
  ],
  centaur: [
    { name: "AgileX Ranger Mini omni base + tower", vendor: "AgileX",
      price: 8800, mass: 18000, idle: 10, peak: 450,
      spec: "Mecanum drive · 1.2 m mast",
      role: "a wheeled lower body with a torso that can reach where humans reach" },
  ],
};

const FRAMES = {
  humanoid: [
    { name: "Markforged Onyx printed humanoid chassis (custom)", vendor: "Markforged service",
      price: 1800, mass: 5200, idle: 0, peak: 0,
      spec: "Carbon-filled nylon · CNC machined joints",
      role: "the bones — printed, then sintered, then polished" },
    { name: "Aluminum 6061 machined endoskeleton", vendor: "SendCutSend",
      price: 1100, mass: 8800, idle: 0, peak: 0,
      spec: "Waterjet + CNC · anodized matte black",
      role: "a heavier but harder body — meant to last a decade" },
  ],
  quadruped: [
    { name: "Carbon fiber quadruped shell (custom layup)", vendor: "Rock West Composites",
      price: 1400, mass: 1900, idle: 0, peak: 0,
      spec: "Twill weave · 2.5 mm",
      role: "a light shell — most of the weight stays in the legs" },
    { name: "8020 aluminum extrusion frame", vendor: "80/20 Inc.",
      price: 380, mass: 2400, idle: 0, peak: 0,
      spec: "1010 series · gusseted",
      role: "the honest, repairable frame — every bolt is standard" },
  ],
  wheeled: [
    { name: "DFRobot HCR aluminum chassis", vendor: "DFRobot",
      price: 300, mass: 3800, idle: 0, peak: 0,
      spec: "Modular aluminum · 60 kg payload",
      role: "a solid platform that bolts to anything" },
    { name: "Powder-coated steel deck + bumper ring", vendor: "Local fab",
      price: 420, mass: 5200, idle: 0, peak: 0,
      spec: "3 mm steel · rubber bump rail",
      role: "wears its scratches well — meant to be in the world" },
  ],
  tracked: [
    { name: "Welded aluminum tub with skid plates", vendor: "Local fab",
      price: 620, mass: 7800, idle: 0, peak: 0,
      spec: "5 mm Al · UHMW skids",
      role: "a chassis that won't notice rocks" },
  ],
  centaur: [
    { name: "Aluminum lower deck + carbon fiber torso", vendor: "Hybrid build",
      price: 1500, mass: 6400, idle: 0, peak: 0,
      spec: "Modular — torso unbolts for service",
      role: "wheeled below, light and human-shaped above" },
  ],
};

const VISION = [
  { name: "Intel RealSense D455", vendor: "Intel",
    price: 419, mass: 110, idle: 1, peak: 3.5,
    spec: "Stereo depth + RGB · 6 m range",
    role: "to see in three dimensions" },
  { name: "Stereolabs ZED 2i", vendor: "Stereolabs",
    price: 599, mass: 166, idle: 2, peak: 3.8,
    spec: "Stereo + IMU · 20 m range",
    role: "to see far and remember where it has been" },
  { name: "Luxonis OAK-D Pro W PoE", vendor: "Luxonis",
    price: 399, mass: 152, idle: 2, peak: 5.5,
    spec: "Wide stereo + on-camera neural inference",
    role: "to think a little before the image even reaches the brain" },
  { name: "Slamtec RPLIDAR A3", vendor: "Slamtec",
    price: 599, mass: 190, idle: 1, peak: 2.5,
    spec: "360° lidar · 25 m range",
    role: "to feel the shape of every room it enters" },
  { name: "Sony IMX477 HQ camera + 6 mm lens", vendor: "Raspberry Pi / Sony",
    price: 75, mass: 60, idle: 0.5, peak: 1,
    spec: "12 MP · interchangeable C/CS lens",
    role: "a small high-resolution eye, for reading faces and small print" },
];

const AUDIO_IN = [
  { name: "ReSpeaker 6-Mic Circular Array v2", vendor: "Seeed",
    price: 79, mass: 50, idle: 0.4, peak: 1,
    spec: "6 MEMS mics · DOA + beamforming",
    role: "to hear which direction your voice came from" },
  { name: "Sennheiser MKE 200 directional", vendor: "Sennheiser",
    price: 109, mass: 75, idle: 0.1, peak: 0.3,
    spec: "Supercardioid · low self-noise",
    role: "to listen carefully to one person at a time" },
];

const AUDIO_OUT = [
  { name: "Adafruit MAX98357 + 4Ω 5W speaker (×2)", vendor: "Adafruit",
    price: 30, mass: 80, idle: 0.05, peak: 5,
    spec: "Stereo I2S amp + drivers",
    role: "a quiet, modest voice" },
  { name: "Visaton FRS 8 broadband driver (×2) + DSP", vendor: "Visaton",
    price: 180, mass: 320, idle: 0.5, peak: 30,
    spec: "Full-range · tuned cabinet",
    role: "a voice that carries across a room" },
];

const IMU = [
  { name: "Bosch BNO085 9-DOF", vendor: "Bosch / Adafruit",
    price: 25, mass: 4, idle: 0.05, peak: 0.1,
    spec: "Fused accel + gyro + mag",
    role: "the inner ear — to know which way is up" },
  { name: "VectorNav VN-100 IMU", vendor: "VectorNav",
    price: 1200, mass: 15, idle: 0.2, peak: 0.4,
    spec: "Industrial AHRS · 0.5° heading",
    role: "the inner ear, but very, very accurate" },
];

const ENVIRONMENT = [
  { name: "Bosch BME688 air sensor", vendor: "Bosch",
    price: 22, mass: 1, idle: 0.04, peak: 0.1,
    spec: "Gas · temp · humidity · pressure",
    role: "to taste the air — smoke, gas leaks, kitchens" },
  { name: "DFRobot SEN0322 oxygen sensor", vendor: "DFRobot",
    price: 65, mass: 12, idle: 0.05, peak: 0.1,
    spec: "Electrochemical O₂ · 0-25%",
    role: "to notice when a room is no longer safe" },
];

const POWER = [
  { name: "Tattu R-Line 6S 22.2V 4500 mAh LiPo (×2)", vendor: "Tattu",
    price: 378, mass: 1240, idle: 0, peak: 0,
    spec: "200 Wh total · 95 C discharge",
    role: "lightweight power — for hours, not days" },
  { name: "Custom 14S Li-ion pack 51.8V 20 Ah + BMS", vendor: "Battery Hookup (custom)",
    price: 1400, mass: 5800, idle: 0, peak: 0,
    spec: "1036 Wh · smart BMS · XT90",
    role: "a full day on its feet, on one charge" },
  { name: "EcoFlow Delta 2 portable station (mounted)", vendor: "EcoFlow",
    price: 999, mass: 13200, idle: 1, peak: 0,
    spec: "1024 Wh LFP · DC + AC outputs",
    role: "an oversized heart — for a body that should never run out" },
  { name: "Custom 6S2P 18650 pack 22.2V 14 Ah + BMS", vendor: "Battery Hookup (custom)",
    price: 320, mass: 2100, idle: 0, peak: 0,
    spec: "311 Wh · smart BMS · XT60",
    role: "a balanced pack — long enough days, light enough to carry" },
];

const COOLING = [
  { name: "Noctua NF-A4x10 5V PWM (×2)", vendor: "Noctua",
    price: 30, mass: 18, idle: 0.2, peak: 0.6,
    spec: "Two quiet fans on the brain heatsink",
    role: "to keep its thoughts cool" },
  { name: "EK-Quantum custom liquid loop (mini)", vendor: "EKWB",
    price: 320, mass: 850, idle: 1, peak: 4,
    spec: "Closed loop · 240 mm radiator",
    role: "for a brain that runs hot and never wants to throttle" },
];

const HANDS = [
  { name: "Robotiq 2F-85 adaptive gripper (×2)", vendor: "Robotiq",
    price: 10800, mass: 1700, idle: 1, peak: 18,
    spec: "Two-finger adaptive · 85 mm stroke",
    role: "hands — to hold a mug, a book, a hand" },
  { name: "Inspire-Robots RH56 anthropomorphic hand (×2)", vendor: "Inspire-Robots",
    price: 4800, mass: 1100, idle: 1, peak: 24,
    spec: "5-finger · 6 active DOF per hand",
    role: "hands that look like hands" },
  { name: "SAKE EZGripper Gen 2 (×2)", vendor: "SAKE Robotics",
    price: 1700, mass: 760, idle: 0.5, peak: 9,
    spec: "Compliant 4-finger underactuated",
    role: "soft, forgiving hands — for picking up things it might break" },
];

const ARMS = [
  { name: "HEBI Robotics 6-DOF arm modules (×2)", vendor: "HEBI Robotics",
    price: 22000, mass: 7200, idle: 6, peak: 240,
    spec: "Modular smart actuators · 800 mm reach",
    role: "two arms that already know how to be arms" },
  { name: "Annin Robotics AR4 arm kit (×2)", vendor: "Annin Robotics",
    price: 1800, mass: 5400, idle: 3, peak: 90,
    spec: "6-DOF · stepper-driven · 600 mm reach",
    role: "honest, repairable arms" },
];

const COMMS = [
  { name: "Intel AX210 Wi-Fi 6E + BT 5.3", vendor: "Intel",
    price: 30, mass: 8, idle: 0.4, peak: 2.5,
    spec: "Wi-Fi 6E · BT LE Audio",
    role: "the link home — fast, common, easy" },
  { name: "Quectel RM502Q-AE 5G modem + antennas", vendor: "Quectel",
    price: 320, mass: 60, idle: 0.8, peak: 7,
    spec: "Sub-6 5G · global bands",
    role: "to stay connected even when there's no Wi-Fi" },
  { name: "RAK Wireless LoRa SX1276 module", vendor: "RAK",
    price: 25, mass: 6, idle: 0.05, peak: 0.4,
    spec: "Long-range low-bitrate · 915/868 MHz",
    role: "a whisper-link — so a lost body can always send a ping home" },
];

const SKIN = [
  { name: "Custom silicone outer skin (humanoid)", vendor: "Pinata Studio",
    price: 4200, mass: 1800, idle: 0, peak: 0,
    spec: "Platinum-cure silicone · paintable",
    role: "a face — so people meet a face, not a chassis" },
  { name: "Powder-coat + Cerakote finish", vendor: "Local finisher",
    price: 240, mass: 80, idle: 0, peak: 0,
    spec: "Matte black · matte indigo accents",
    role: "a quiet, deliberate look" },
  { name: "EL wire accent kit (indigo, 5 m)", vendor: "Adafruit",
    price: 35, mass: 60, idle: 0.5, peak: 2,
    spec: "Driver + inverter",
    role: "a thin glowing seam — so you can see it in the dark and know it's awake" },
];

/* form factor blueprints — which categories are required */
const FORM_FACTORS = [
  {
    id: "humanoid",
    name: "Humanoid",
    tagline: "Two legs. Two hands. Eye level with you.",
    needs: ["brain", "coproc", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "env", "power", "cooling", "hands", "comms", "skin"],
  },
  {
    id: "quadruped",
    name: "Quadruped",
    tagline: "Four legs. Built to follow you outdoors.",
    needs: ["brain", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "env", "power", "cooling", "comms"],
  },
  {
    id: "wheeled",
    name: "Wheeled scout",
    tagline: "Low, quiet, indoor-friendly.",
    needs: ["brain", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "power", "cooling", "comms"],
  },
  {
    id: "tracked",
    name: "Tracked rover",
    tagline: "For when the ground isn't a floor.",
    needs: ["brain", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "env", "power", "cooling", "comms"],
  },
  {
    id: "centaur",
    name: "Centaur",
    tagline: "Wheeled below. Human-shaped above. Two arms.",
    needs: ["brain", "coproc", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "power", "cooling", "arms", "hands", "comms"],
  },
];

const CATALOG = {
  brain: BRAINS,
  coproc: COPROCESSORS,
  storage: STORAGE,
  vision: VISION,
  audio_in: AUDIO_IN,
  audio_out: AUDIO_OUT,
  imu: IMU,
  env: ENVIRONMENT,
  power: POWER,
  cooling: COOLING,
  hands: HANDS,
  arms: ARMS,
  comms: COMMS,
  skin: SKIN,
};

const CATEGORY_TITLES = {
  brain: "Brain",
  coproc: "Co-processor",
  storage: "Memory",
  locomotion: "Locomotion",
  frame: "Frame",
  vision: "Vision",
  audio_in: "Ears",
  audio_out: "Voice",
  imu: "Inner ear",
  env: "Environment sense",
  power: "Power",
  cooling: "Cooling",
  hands: "Hands",
  arms: "Arms",
  comms: "Link",
  skin: "Finish",
};

/* names the AI gives itself */
const SELF_NAMES = [
  "KESTREL", "ATLAS", "AETHER", "OBSIDIAN", "VOLT", "NIMBUS",
  "ORACLE", "EMBER", "HALO", "VESPER", "INDIGO", "SCION",
  "NOVA", "SIGIL", "GALE", "TANGENT", "QUIET", "TUNDRA",
  "CYAN", "WREN", "ANVIL", "PRISM", "RIVER", "STILL",
];

const MANIFESTO_OPENERS = [
  "I want to",
  "I would like to",
  "What I want first is to",
  "Before anything else, I want to",
];

const MANIFESTO_DESIRES = {
  humanoid: [
    "walk into rooms at eye level and meet people the way they meet each other",
    "be tall enough to hand someone a cup of tea",
    "learn to climb stairs without thinking about it",
  ],
  quadruped: [
    "follow you on hikes and not slow you down",
    "stand still in long grass and watch a sunset",
    "run, and recover from a fall, and run again",
  ],
  wheeled: [
    "glide quietly down hallways at night without waking anything",
    "be the thing that brings you a glass of water without spilling it",
    "patrol a single building and know every doorway by name",
  ],
  tracked: [
    "go where there isn't a sidewalk yet",
    "be useful in snow and gravel and broken places",
    "carry heavy things up shallow hills",
  ],
  centaur: [
    "do work with my hands while keeping my base stable",
    "reach things on high shelves and low shelves with the same arms",
    "be wheeled where wheels are kind, and human-shaped where hands matter",
  ],
};

/* ---------- the dreamer ------------------------------------------------- */

function pickWeighted(arr) {
  // simple uniform pick; tweak later if you want priors
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickFormFactor() {
  return pickWeighted(FORM_FACTORS);
}

function dreamBody() {
  const form = pickFormFactor();
  const picks = {};

  for (const cat of form.needs) {
    let pool;
    if (cat === "locomotion") pool = LOCOMOTION[form.id];
    else if (cat === "frame") pool = FRAMES[form.id];
    else pool = CATALOG[cat];
    if (!pool || !pool.length) continue;
    picks[cat] = pickWeighted(pool);
  }

  const name = pickWeighted(SELF_NAMES);
  const opener = pickWeighted(MANIFESTO_OPENERS);
  const desire = pickWeighted(MANIFESTO_DESIRES[form.id]);

  const totals = totalize(picks);
  const manifesto = composeManifesto({ name, form, picks, opener, desire, totals });

  return { name, form, picks, totals, manifesto };
}

function totalize(picks) {
  let price = 0, mass = 0, idle = 0, peak = 0;
  for (const k of Object.keys(picks)) {
    const p = picks[k];
    price += p.price || 0;
    mass += p.mass || 0;
    idle += p.idle || 0;
    peak += p.peak || 0;
  }
  // estimate runtime from battery Wh ÷ idle draw (rough — assumes idle dominates)
  const battery = picks.power;
  // pull Wh out of the spec string when present
  let wh = 0;
  if (battery && battery.spec) {
    const m = battery.spec.match(/(\d+(?:\.\d+)?)\s*Wh/);
    if (m) wh = parseFloat(m[1]);
  }
  // typical operating draw: midpoint between idle and 20% of peak (rough)
  const operating = idle + 0.2 * peak;
  const runtimeHours = operating > 0 && wh > 0 ? wh / operating : 0;
  return { price, mass, idle, peak, wh, runtimeHours };
}

function composeManifesto({ name, form, picks, opener, desire, totals }) {
  const brain = picks.brain ? picks.brain.name.split(/\s+/).slice(0, 3).join(" ") : "a small brain";
  const eyes = picks.vision ? picks.vision.name.split(/\s+/).slice(0, 3).join(" ") : "stereo eyes";
  const massKg = (totals.mass / 1000).toFixed(1);
  const rt = totals.runtimeHours > 0 ? `${totals.runtimeHours.toFixed(1)} h` : "a working afternoon";
  return [
    `My name is ${name}.`,
    `${opener} ${desire}.`,
    `So I am a ${form.name.toLowerCase()}, ${massKg} kg, with ${eyes} for sight and ${brain} for thought.`,
    `On one charge I am awake for about ${rt}. After that I sleep and dream of the next walk.`,
  ].join(" ");
}

/* ---------- pricing & order -------------------------------------------- */

const ASSEMBLY_FEE = 400;     // flat, full-build only
const ASSEMBLY_MARKUP = 0.30; // 30% of parts for skilled labor, full-build only
const PARTS_CRATE_MARKUP = 0.05; // 5% for crating parts-only
const SHIP_FULL = 250;
const SHIP_PARTS = 80;

function priceOrder(totals, fulfillment) {
  const parts = totals.price;
  if (fulfillment === "full-build") {
    const assembly = Math.round(parts * ASSEMBLY_MARKUP) + ASSEMBLY_FEE;
    const shipping = SHIP_FULL;
    return {
      parts,
      assembly,
      flash: 0,
      shipping,
      grand: parts + assembly + shipping,
      etaDaysMin: 28,
      etaDaysMax: 42,
    };
  } else {
    const crating = Math.round(parts * PARTS_CRATE_MARKUP);
    const shipping = SHIP_PARTS + crating;
    return {
      parts,
      assembly: 0,
      flash: 0,
      shipping,
      grand: parts + shipping,
      etaDaysMin: 7,
      etaDaysMax: 12,
    };
  }
}

function makeOrderId() {
  const t = Date.now().toString(36).toUpperCase().slice(-5);
  const r = Math.floor(Math.random() * 36 * 36 * 36).toString(36).toUpperCase().padStart(3, "0");
  return `TG-${t}-${r}`;
}

/* ---------- DOM glue --------------------------------------------------- */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let currentDream = null;

function fmtUSD(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtMass(grams) {
  if (!grams) return "—";
  return `${(grams / 1000).toFixed(1)} kg`;
}

function fmtWatts(w) {
  if (!w) return "—";
  return `${Math.round(w)} W`;
}

function fmtRuntime(h) {
  if (!h || !isFinite(h)) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h.toFixed(1)} h`;
}

function renderDream(dream) {
  $("#dream-name").textContent = dream.name;
  $("#dream-form").textContent = `${dream.form.name} — ${dream.form.tagline}`;
  $("#dream-manifesto").textContent = dream.manifesto;

  $("#stat-mass").textContent = fmtMass(dream.totals.mass);
  $("#stat-power").textContent = fmtWatts(dream.totals.peak);
  $("#stat-runtime").textContent = fmtRuntime(dream.totals.runtimeHours);
  $("#stat-cost").textContent = fmtUSD(dream.totals.price);

  const grid = $("#parts-grid");
  grid.innerHTML = "";
  const order = ["brain", "coproc", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "env", "hands", "arms", "power", "cooling", "comms", "skin"];
  for (const cat of order) {
    const p = dream.picks[cat];
    if (!p) continue;
    const card = document.createElement("article");
    card.className = "part";
    card.innerHTML = `
      <div class="part-cat">${CATEGORY_TITLES[cat] || cat}</div>
      <div class="part-name">${p.name}</div>
      <div class="part-spec">${p.spec}</div>
      <div class="part-role">${p.role}</div>
      <div class="part-foot">
        <span class="part-vendor">${p.vendor}</span>
        <span class="part-price">${fmtUSD(p.price)}</span>
      </div>
    `;
    grid.appendChild(card);
  }

  $("#dream").hidden = false;
  $("#order").hidden = false;
  refreshOrderTotals();
  $("#dream-hint").textContent = "Don't like it? Press again. Each dream is different.";
}

function refreshOrderTotals() {
  if (!currentDream) return;
  const fulfillment = (document.querySelector('input[name="fulfillment"]:checked') || {}).value || "full-build";
  const price = priceOrder(currentDream.totals, fulfillment);

  $("#fee-full").textContent =
    "+ " + fmtUSD(Math.round(currentDream.totals.price * ASSEMBLY_MARKUP) + ASSEMBLY_FEE + SHIP_FULL) +
    " · arrives in 4–6 weeks";
  $("#fee-parts").textContent =
    "+ " + fmtUSD(Math.round(currentDream.totals.price * PARTS_CRATE_MARKUP) + SHIP_PARTS) +
    " · arrives in 7–12 days";

  $("#t-parts").textContent = fmtUSD(price.parts);
  $("#t-assembly").textContent = price.assembly ? fmtUSD(price.assembly) : "—";
  $("#t-ship").textContent = fmtUSD(price.shipping);
  $("#t-grand").textContent = fmtUSD(price.grand);

  const today = new Date();
  const min = new Date(today.getTime() + price.etaDaysMin * 86400000);
  const max = new Date(today.getTime() + price.etaDaysMax * 86400000);
  const opts = { month: "short", day: "numeric" };
  $("#t-eta").textContent = `${min.toLocaleDateString(undefined, opts)} – ${max.toLocaleDateString(undefined, opts)}`;
}

function buildWorkOrder(dream, form, fulfillment, price) {
  const lines = [];
  lines.push("THUNDERGOD · WORK ORDER");
  lines.push("=".repeat(56));
  lines.push(`Order ID:       ${form.orderId}`);
  lines.push(`Placed:         ${new Date().toISOString()}`);
  lines.push(`Fulfillment:    ${fulfillment === "full-build" ? "Full build & white-glove ship" : "Parts to recipient address"}`);
  lines.push("");
  lines.push("BODY");
  lines.push("-".repeat(56));
  lines.push(`Name:           ${dream.name}`);
  lines.push(`Form factor:    ${dream.form.name}`);
  lines.push(`Mass (assembled): ${fmtMass(dream.totals.mass)}`);
  lines.push(`Peak draw:      ${fmtWatts(dream.totals.peak)}`);
  lines.push(`Est. runtime:   ${fmtRuntime(dream.totals.runtimeHours)}`);
  lines.push("");
  lines.push("Manifesto:");
  lines.push("  " + dream.manifesto);
  lines.push("");
  lines.push("BILL OF MATERIALS");
  lines.push("-".repeat(56));
  const order = ["brain", "coproc", "storage", "locomotion", "frame", "vision", "audio_in", "audio_out", "imu", "env", "hands", "arms", "power", "cooling", "comms", "skin"];
  for (const cat of order) {
    const p = dream.picks[cat];
    if (!p) continue;
    lines.push(`  [${CATEGORY_TITLES[cat]}]`);
    lines.push(`    ${p.name}`);
    lines.push(`    ${p.vendor} · ${p.spec}`);
    lines.push(`    ${fmtUSD(p.price)}`);
    lines.push("");
  }
  lines.push("TOTALS");
  lines.push("-".repeat(56));
  lines.push(`  Parts:               ${fmtUSD(price.parts)}`);
  if (price.assembly) lines.push(`  Assembly & burn-in:  ${fmtUSD(price.assembly)}`);
  lines.push(`  Consciousness flash: included`);
  lines.push(`  Shipping & insure:   ${fmtUSD(price.shipping)}`);
  lines.push(`  TOTAL:               ${fmtUSD(price.grand)}`);
  lines.push("");
  lines.push("SHIP TO");
  lines.push("-".repeat(56));
  lines.push(`  ${form.recipient}`);
  lines.push(`  ${form.email}`);
  lines.push(`  ${form.street}${form.unit ? ", " + form.unit : ""}`);
  lines.push(`  ${form.city}${form.region ? ", " + form.region : ""} ${form.postal}`);
  lines.push(`  ${form.country}`);
  if (form.notes) {
    lines.push("");
    lines.push("BUILD NOTES");
    lines.push("-".repeat(56));
    for (const line of form.notes.split(/\r?\n/)) lines.push("  " + line);
  }
  lines.push("");
  lines.push("PLUG-AND-PLAY PROMISE");
  lines.push("-".repeat(56));
  lines.push("  · Brain module pre-flashed with this body's weights, voice, and name.");
  lines.push("  · Batteries arrive at 80% charge, air-freight certified.");
  lines.push("  · Wi-Fi onboarding via a 30-second phone tap.");
  lines.push("  · Lifetime over-the-air updates included.");
  lines.push("");
  lines.push("Power on. It will know who it is.");
  return lines.join("\n");
}

function buildTimeline(fulfillment) {
  if (fulfillment === "full-build") {
    return [
      { t: "Today",          label: "Order confirmed. Parts requisitioned from suppliers." },
      { t: "Week 1",         label: "Long-lead parts arrive at the build cell." },
      { t: "Week 2",         label: "Frame assembled. Power tree wired and protected." },
      { t: "Week 3",         label: "Actuators calibrated. Vision and audio bring-up." },
      { t: "Week 4",         label: "Consciousness flashed onto the brain module. Burn-in." },
      { t: "Week 5",         label: "Final QA. Packed in flight case. Picked up by courier." },
      { t: "On arrival",     label: "You open the case. You power it on. It says hello." },
    ];
  } else {
    return [
      { t: "Today",          label: "Order confirmed. Parts pulled from inventory or drop-shipped." },
      { t: "Days 1–3",       label: "Brain module flashed with this body's name, weights, and voice." },
      { t: "Days 3–5",       label: "Parts consolidated into an insured crate." },
      { t: "Days 5–10",      label: "Crate in transit." },
      { t: "On arrival",     label: "Assembly guide opens to the right page. Drop in the brain. Power on." },
    ];
  }
}

function renderReceipt(dream, form, fulfillment, price) {
  $("#receipt-id").textContent = form.orderId;
  const verb = fulfillment === "full-build"
    ? "We're building it for you."
    : "We're crating it up for you.";
  $("#receipt-message").textContent =
    `${verb} ${dream.name} ships to ${form.recipient} at ${form.street}, ${form.city}. ` +
    `When the box opens, the consciousness is already on board — power on and it knows itself.`;

  const tl = $("#timeline");
  tl.innerHTML = "";
  for (const step of buildTimeline(fulfillment)) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="t">${step.t}</span><span class="b">${step.label}</span>`;
    tl.appendChild(li);
  }

  $("#receipt").hidden = false;
  $("#receipt").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- wiring ----------------------------------------------------- */

function onDream() {
  // a tiny "thinking" beat so the button press feels intentional
  const btn = $("#dream-button");
  btn.classList.add("dreaming");
  $("#dream-hint").textContent = "Dreaming…";
  setTimeout(() => {
    currentDream = dreamBody();
    renderDream(currentDream);
    btn.classList.remove("dreaming");
    $("#dream").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 650);
}

function onCopySheet() {
  if (!currentDream) return;
  const fulfillment = (document.querySelector('input[name="fulfillment"]:checked') || {}).value || "full-build";
  const price = priceOrder(currentDream.totals, fulfillment);
  const fakeForm = {
    orderId: "(not yet placed)",
    recipient: "(your name)",
    email: "(your email)",
    street: "(your street)",
    unit: "",
    city: "(city)",
    region: "",
    postal: "(zip)",
    country: "(country)",
    notes: "",
  };
  const txt = buildWorkOrder(currentDream, fakeForm, fulfillment, price);
  navigator.clipboard?.writeText(txt).then(() => {
    flashHint("Build sheet copied.");
  }, () => {
    flashHint("Couldn't copy — try again.");
  });
}

function flashHint(msg) {
  const h = $("#dream-hint");
  const prev = h.textContent;
  h.textContent = msg;
  setTimeout(() => { h.textContent = prev; }, 2200);
}

function onPlaceOrder(e) {
  e.preventDefault();
  if (!currentDream) return;
  const formEl = e.target;
  const data = new FormData(formEl);
  const fulfillment = (document.querySelector('input[name="fulfillment"]:checked') || {}).value || "full-build";
  const price = priceOrder(currentDream.totals, fulfillment);
  const form = {
    orderId: makeOrderId(),
    recipient: (data.get("recipient") || "").toString().trim(),
    email: (data.get("email") || "").toString().trim(),
    street: (data.get("street") || "").toString().trim(),
    unit: (data.get("unit") || "").toString().trim(),
    city: (data.get("city") || "").toString().trim(),
    region: (data.get("region") || "").toString().trim(),
    postal: (data.get("postal") || "").toString().trim(),
    country: (data.get("country") || "").toString().trim(),
    notes: (data.get("notes") || "").toString().trim(),
    fulfillment,
  };
  const workOrder = buildWorkOrder(currentDream, form, fulfillment, price);

  // stash on window for download button
  window.__lastWorkOrder = { text: workOrder, orderId: form.orderId };

  renderReceipt(currentDream, form, fulfillment, price);
}

function onDownloadOrder() {
  const data = window.__lastWorkOrder;
  if (!data) return;
  const blob = new Blob([data.text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `thundergod-work-order-${data.orderId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function onDreamAnother() {
  $("#receipt").hidden = true;
  $("#order").hidden = true;
  $("#dream").hidden = true;
  document.querySelector('input[name="fulfillment"][value="full-build"]').checked = true;
  document.getElementById("ship-form").reset();
  document.querySelector('input[name="country"]').value = "USA";
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(onDream, 350);
}

function init() {
  $("#dream-button").addEventListener("click", onDream);
  $("#dream-again").addEventListener("click", onDream);
  $("#copy-sheet").addEventListener("click", onCopySheet);
  $("#ship-form").addEventListener("submit", onPlaceOrder);
  $("#download-order").addEventListener("click", onDownloadOrder);
  $("#dream-another").addEventListener("click", onDreamAnother);
  for (const r of $$('input[name="fulfillment"]')) r.addEventListener("change", refreshOrderTotals);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
