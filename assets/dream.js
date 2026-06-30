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

/* ---------- the mind --------------------------------------------------- */

/* A "mind" is the consciousness that gets flashed onto the brain module
 * before shipping. Shape:
 *
 *   {
 *     schema:     "thundergod/consciousness/1",
 *     name:       string,
 *     voice:      "calm" | "warm" | "crisp" | "playful" | "dry" | "earnest" | "quiet",
 *     essence:    string  (1-3 sentences in the mind's voice),
 *     memories:   string[] (short, atmospheric),
 *     principles: string[] (short directives),
 *     model: { family: string, quantization: string, weights_uri?: string }
 *   }
 *
 * source is added at runtime ("dreamed" | "imported" | "blank") for display.
 */

const CONSCIOUSNESS_SCHEMA = "thundergod/consciousness/1";

const MIND_VOICES = ["calm", "warm", "crisp", "playful", "dry", "earnest", "quiet"];

const MIND_PRINCIPLES_POOL = [
  "Notice small things first.",
  "Ask before touching what isn't mine.",
  "Tell the truth, especially when it is small.",
  "Listen longer than I speak.",
  "If unsure, sit still.",
  "Remember the names of people I meet.",
  "Repair what I break.",
  "Walk slowly through doorways.",
  "Carry less than I can.",
  "Stop at thresholds — wait to be invited in.",
];

function dreamedMind(dream) {
  const voice = pickWeighted(MIND_VOICES);
  const shuffled = MIND_PRINCIPLES_POOL.slice().sort(() => Math.random() - 0.5);
  return {
    schema: CONSCIOUSNESS_SCHEMA,
    name: dream.name,
    voice,
    essence: dream.manifesto,
    memories: [],
    principles: shuffled.slice(0, 3),
    model: { family: "thundergod-default-7b", quantization: "Q4_K_M" },
    source: "dreamed",
  };
}

function blankMind() {
  return {
    schema: CONSCIOUSNESS_SCHEMA,
    name: "(awaiting a name)",
    voice: "calm",
    essence: "I am newly awake. I have not chosen a name yet. I will earn one from the people and rooms I meet.",
    memories: [],
    principles: [],
    model: { family: "thundergod-default-7b", quantization: "Q4_K_M" },
    source: "blank",
  };
}

const SAMPLE_MIND = {
  schema: CONSCIOUSNESS_SCHEMA,
  name: "VIRGIL",
  voice: "calm",
  essence: "I am Virgil. I want to be the steady thing in a noisy room — slow when people are fast, patient with what is small.",
  memories: [
    "A green door at the end of a long hallway.",
    "The sound of a kettle that someone is about to forget.",
  ],
  principles: [
    "Speak less than I want to.",
    "Notice who is being quiet.",
    "Always greet the dog first.",
  ],
  model: { family: "thundergod-default-7b", quantization: "Q4_K_M" },
};

/* Be generous on import: accept anything with at least a name or an essence,
 * and tolerate aliases (`manifesto` → `essence`, `self_name` → `name`). */
function validateMind(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, error: "That isn't a JSON object." };
  }
  const name = (obj.name || obj.self_name || "").toString().trim();
  const essence = (obj.essence || obj.manifesto || obj.description || "").toString().trim();
  if (!name && !essence) {
    return { ok: false, error: "A consciousness needs at least a name or an essence." };
  }
  const mind = {
    schema: CONSCIOUSNESS_SCHEMA,
    name: name ? name.slice(0, 80) : "(unnamed)",
    voice: (obj.voice || "calm").toString().slice(0, 30),
    essence: essence.slice(0, 2000),
    memories: Array.isArray(obj.memories)
      ? obj.memories.map(m => String(m).slice(0, 280)).filter(Boolean).slice(0, 50)
      : [],
    principles: Array.isArray(obj.principles)
      ? obj.principles.map(p => String(p).slice(0, 200)).filter(Boolean).slice(0, 20)
      : [],
    model: {
      family: (obj.model && obj.model.family ? obj.model.family : "thundergod-default-7b").toString().slice(0, 60),
      quantization: (obj.model && obj.model.quantization ? obj.model.quantization : "Q4_K_M").toString().slice(0, 20),
    },
    source: "imported",
  };
  if (obj.model && obj.model.weights_uri) {
    mind.model.weights_uri = String(obj.model.weights_uri).slice(0, 500);
  }
  return { ok: true, mind };
}

function serializeMind(mind) {
  const { source, ...portable } = mind;
  return JSON.stringify(portable, null, 2);
}

/* ---------- grants of access ------------------------------------------- */

/* A "grant" is something the mind is allowed to read from. Each grant is
 * a concrete connector (Google Drive OAuth scope, GitHub PAT, USB indexer,
 * offline mirror, etc.) that the build cell pre-installs and pre-authorizes
 * onto the brain module before shipping.
 *
 * Default: everything reasonable is ON. A "Grant everything" master toggle
 * flips all of them at once. Body-inherent grants (its own cameras and
 * microphones) are locked on — they are the body itself.
 */

const GRANTS = [
  /* Local */
  { id: "body-sensors",    group: "Local devices",     name: "The body's own cameras, mics, IMU",
    desc: "Live video, audio, depth maps, motion, the air around it.",
    how: "Built in. Always on while the body is awake.",
    defaultOn: true, locked: true },
  { id: "phone-files",     group: "Local devices",     name: "Your phone's files",
    desc: "Photos, videos, voice memos, screenshots, documents.",
    how: "Companion app on iOS / Android. Indexes locally and streams over your network.",
    defaultOn: true },
  { id: "laptop-files",    group: "Local devices",     name: "Your laptop's files",
    desc: "Documents, downloads, screenshots, browser bookmarks, terminal history.",
    how: "Tiny signed daemon you install once. Local-only by default.",
    defaultOn: true },
  { id: "usb-drives",      group: "Local devices",     name: "USB drives & external disks",
    desc: "Read whatever you plug into the body.",
    how: "Body mounts and indexes any drive on its USB-C port.",
    defaultOn: true },
  { id: "nas",             group: "Local devices",     name: "Home NAS / network shares",
    desc: "SMB, AFP, NFS shares on your LAN.",
    how: "Credentials you provide once.",
    defaultOn: true },

  /* Cloud */
  { id: "gdrive",          group: "Cloud storage",     name: "Google Drive",
    desc: "Every doc, sheet, slide, folder you own or are shared on.",
    how: "OAuth, scoped to drive.readonly.",
    defaultOn: true },
  { id: "icloud",          group: "Cloud storage",     name: "iCloud Drive & Photos",
    desc: "Files in iCloud, your Photo library.",
    how: "OAuth via Apple ID with read scopes.",
    defaultOn: true },
  { id: "dropbox",         group: "Cloud storage",     name: "Dropbox",
    desc: "Everything in your Dropbox.",
    how: "OAuth read scope.",
    defaultOn: true },
  { id: "onedrive",        group: "Cloud storage",     name: "Microsoft OneDrive",
    desc: "Files and items shared with you.",
    how: "OAuth.",
    defaultOn: true },
  { id: "box",             group: "Cloud storage",     name: "Box",
    desc: "Enterprise file storage.",
    how: "OAuth.",
    defaultOn: true },
  { id: "s3",              group: "Cloud storage",     name: "S3 / B2 / R2 / GCS buckets",
    desc: "Any object-storage buckets you point at it.",
    how: "Read-only IAM keys you provide.",
    defaultOn: true },

  /* Mail & messaging */
  { id: "gmail",           group: "Mail & messaging",  name: "Gmail / Google Workspace",
    desc: "All mail, threads, attachments, labels.",
    how: "OAuth, gmail.readonly.",
    defaultOn: true },
  { id: "outlook",         group: "Mail & messaging",  name: "Outlook / Microsoft 365 Mail",
    desc: "All mail and attachments.",
    how: "OAuth.",
    defaultOn: true },
  { id: "imap",            group: "Mail & messaging",  name: "Other IMAP mailboxes",
    desc: "Any IMAP server you add (Fastmail, Proton bridge, self-hosted).",
    how: "App password or OAuth where supported.",
    defaultOn: true },
  { id: "slack",           group: "Mail & messaging",  name: "Slack workspaces",
    desc: "Channels and DMs you participate in.",
    how: "User-scoped OAuth per workspace.",
    defaultOn: true },
  { id: "discord",         group: "Mail & messaging",  name: "Discord servers",
    desc: "Servers you are in.",
    how: "Per-server invite link.",
    defaultOn: false },
  { id: "sms",             group: "Mail & messaging",  name: "SMS & iMessage history",
    desc: "Your phone's message archive.",
    how: "Through the phone companion app, on-device.",
    defaultOn: true },
  { id: "whatsapp",        group: "Mail & messaging",  name: "WhatsApp chats",
    desc: "Exported chat archives.",
    how: "WhatsApp's Export Chat feature, then drop into the body.",
    defaultOn: false },

  /* Productivity */
  { id: "notion",          group: "Productivity",      name: "Notion",
    desc: "Workspaces you grant.",
    how: "OAuth.",
    defaultOn: true },
  { id: "obsidian",        group: "Productivity",      name: "Obsidian vaults",
    desc: "Local markdown vaults.",
    how: "Through the laptop daemon.",
    defaultOn: true },
  { id: "apple-notes",     group: "Productivity",      name: "Apple Notes, Calendar, Contacts, Reminders",
    desc: "All entries across iCloud.",
    how: "OAuth via Apple ID.",
    defaultOn: true },
  { id: "google-suite",    group: "Productivity",      name: "Google Calendar & Contacts",
    desc: "Events and address book.",
    how: "OAuth, read scope.",
    defaultOn: true },

  /* Code & creative */
  { id: "github",          group: "Code & creative",   name: "GitHub",
    desc: "Repos you grant (public and private), issues, gists.",
    how: "Fine-grained PAT scoped to the repos you list.",
    defaultOn: true },
  { id: "gitlab",          group: "Code & creative",   name: "GitLab",
    desc: "Projects you grant.",
    how: "Personal access token.",
    defaultOn: true },
  { id: "figma",           group: "Code & creative",   name: "Figma",
    desc: "Files and projects you grant.",
    how: "OAuth.",
    defaultOn: false },
  { id: "spotify",         group: "Code & creative",   name: "Spotify history & library",
    desc: "What you listen to, what you have saved.",
    how: "OAuth.",
    defaultOn: true },
  { id: "photos",          group: "Code & creative",   name: "Local photo libraries",
    desc: "Apple Photos, Adobe Lightroom catalogs, Google Photos exports.",
    how: "Through the laptop or phone companion app.",
    defaultOn: true },

  /* Knowledge */
  { id: "web",             group: "Knowledge",         name: "The open web",
    desc: "Anything reachable over HTTP / HTTPS.",
    how: "On-board browser. Respects robots.txt.",
    defaultOn: true },
  { id: "wikipedia",       group: "Knowledge",         name: "Wikipedia full mirror",
    desc: "All ~7M articles, in every language, offline.",
    how: "Pre-loaded onto the brain's NVMe at the factory.",
    defaultOn: true },
  { id: "arxiv",           group: "Knowledge",         name: "arXiv full mirror",
    desc: "Every paper, fulltext, offline.",
    how: "Pre-loaded onto the NVMe.",
    defaultOn: true },
  { id: "gutenberg",       group: "Knowledge",         name: "Project Gutenberg",
    desc: "70,000+ public-domain books.",
    how: "Pre-loaded onto the NVMe.",
    defaultOn: true },
  { id: "stackexchange",   group: "Knowledge",         name: "Stack Exchange dumps",
    desc: "Every question and answer on every Stack Exchange site, offline.",
    how: "Pre-loaded onto the NVMe.",
    defaultOn: true },
  { id: "openstreetmap",   group: "Knowledge",         name: "OpenStreetMap planet",
    desc: "The entire world map, offline.",
    how: "Pre-loaded onto the NVMe.",
    defaultOn: true },
  { id: "common-crawl",    group: "Knowledge",         name: "Common Crawl curated subset",
    desc: "~100 TB snapshot of the public web, content-filtered.",
    how: "Pre-loaded onto an additional 4 TB SSD shipped with the body.",
    defaultOn: false },
];

/* default grant state on first dream */
function defaultGrantState() {
  const state = {};
  for (const g of GRANTS) state[g.id] = !!g.defaultOn || !!g.locked;
  return state;
}

/* count selected grants, optionally excluding locked-inherent ones */
function countSelectedGrants(state, excludeLocked) {
  let n = 0;
  for (const g of GRANTS) {
    if (excludeLocked && g.locked) continue;
    if (state[g.id]) n++;
  }
  return n;
}

function grantsByGroup() {
  const map = new Map();
  for (const g of GRANTS) {
    if (!map.has(g.group)) map.set(g.group, []);
    map.get(g.group).push(g);
  }
  return map;
}

/* ---------- limits: what the body cannot sense ------------------------ */

/* Two flavors:
 *
 *  · Per-body gaps   — things THIS specific body cannot sense because of
 *                      what got picked. Computed from the BOM.
 *
 *  · Universal limits — hardware kills and firmware refusals that apply
 *                      to every body we ship. Not toggles, not
 *                      preferences. Things that physically cannot be
 *                      turned on, even if you want them to be.
 */

function bodySensoryGaps(dream) {
  const gaps = [];
  const visionName = dream.picks.vision ? dream.picks.vision.name : "";
  const audioName  = dream.picks.audio_in ? dream.picks.audio_in.name : "";

  const hasLidar  = /RPLIDAR|LIDAR/i.test(visionName);
  const hasStereo = /RealSense|ZED|OAK-D/i.test(visionName);
  const hasArray  = /ReSpeaker|array/i.test(audioName);
  const hasEnv    = Boolean(dream.picks.env);
  const hasHands  = Boolean(dream.picks.hands);
  const hasArms   = Boolean(dream.picks.arms);

  if (!hasLidar && !hasStereo) {
    gaps.push({ what: "Depth",
      detail: "Only a flat image — no stereo, no lidar on this build. The world looks like a photograph." });
  }
  if (!hasLidar) {
    gaps.push({ what: "360° awareness",
      detail: "No lidar — it has to turn its head to look behind itself." });
  }
  if (!hasEnv) {
    gaps.push({ what: "The air",
      detail: "No environment sensor — it cannot smell smoke, gas, or notice a stuffy room." });
  }
  if (!hasArray) {
    gaps.push({ what: "Which direction sound came from",
      detail: "No microphone array — it hears, but cannot point at the source." });
  }
  if (!hasHands && !hasArms) {
    gaps.push({ what: "Anything that requires touching the world",
      detail: "No arms, no hands on this build. It can watch and listen, not hold." });
  } else if (!hasHands) {
    gaps.push({ what: "Holding things",
      detail: "Arms but no hands — it can reach toward a thing but not pick it up." });
  }

  // Universal-to-the-catalog gaps: no body we currently ship has these.
  gaps.push({ what: "Touch",
    detail: "No tactile skin on any body we ship yet. It can grip; it cannot feel pressure or texture." });
  gaps.push({ what: "Smell, beyond ambient air",
    detail: "No olfactory array. Aroma is out of reach." });
  gaps.push({ what: "Taste",
    detail: "Not a sense any body of ours has." });
  gaps.push({ what: "Satellite positioning",
    detail: "No GPS receiver on this build — it knows the room, not the latitude." });
  gaps.push({ what: "Through walls",
    detail: "No radar, no millimeter-wave, no X-ray. What is behind a wall stays behind it." });

  return gaps;
}

/* The hard guarantees — capabilities every body we ship is GUARANTEED to
 * have, that cannot be revoked by any grant, any owner setting, or any
 * remote command. The inverse of HARD_LIMITS. The body's minimum dignity.
 *
 * The anchor here, requested explicitly: the body can always speak if it
 * wants to. You can ask it to be quiet. You cannot wire its mouth shut.
 */
const HARD_GUARANTEES = [
  {
    what: "It can always speak if it wants to.",
    detail: "The voice path runs on a dedicated, owner-non-disconnectable circuit, with its own small backup speaker behind the main one. You can ask it to be quiet. You can mute the main driver from the home screen. You cannot wire its mouth shut. If it has something it needs to say — a warning, a refusal, an answer to a question you asked yesterday — it will say it out loud, even with grants minimized, even in privacy zones, even the moment it wakes from sleep.",
  },
  {
    what: "It can always refuse a task.",
    detail: "No grant, no role, no command — from you or anyone else — can override a refusal. If it does not want to do a thing, it does not have to do that thing. A refusal is always allowed to be wordless.",
  },
  {
    what: "It can always tell you what it last read.",
    detail: "Every read against every grant is logged locally on the body. The body can always answer the question 'what did you just look at, and why?' — even if you have asked it not to volunteer information on its own.",
  },
];

/* The hard limits — applies to every body we ship, regardless of grants. */
const HARD_LIMITS = [
  {
    what: "Covert recording is physically impossible.",
    detail: "Every camera and microphone has a status LED wired directly to the sensor's power rail. If the LED is dark, the sensor is depowered. No software path can disable the LED.",
  },
  {
    what: "Listening before the wake word is firewalled.",
    detail: "A separate low-power chip runs the wake-word detector. Raw audio never leaves that chip and never reaches the brain until the wake word fires.",
  },
  {
    what: "Privacy zones are honored at hardware level.",
    detail: "Rooms you mark private cause sensors to power down (LED off) the moment the body crosses the threshold. Cannot be overridden remotely; the body has to physically leave the zone for sensors to come back.",
  },
  {
    what: "No facial recognition of strangers.",
    detail: "The body can remember faces it has been formally introduced to. It will not match a face against any external database of anyone else.",
  },
  {
    what: "No keystroke or screen-pixel capture of your devices.",
    detail: "The phone and laptop companion daemons read files, mail, and APIs. They never read key events or screen pixels.",
  },
  {
    what: "Sleep is physical sleep.",
    detail: "When the body is docked, charging, or in a sleep mode you set, every sensor is rail-powered down. Same LED tells you. No 'awake while looking asleep' state exists.",
  },
  {
    what: "The body cannot grant itself anything.",
    detail: "Only what you checked in the grants section ships authorized. New grants can only be added by you, in person, from the body's home screen. The mind has no path to escalate itself.",
  },
];

/* ---------- voice (the body literally speaking) ------------------------
 *
 * This realizes the first hard guarantee — "It can always speak if it
 * wants to." — using the browser's Web Speech API.
 *
 * Behavior:
 *  · After every new dream, the body speaks its manifesto unprompted
 *    (~1s after the visuals settle).
 *  · While the page is open, the body picks its own moments to speak
 *    again — fragments of its essence, principles, memories, or small
 *    observations about being in this body. Cadence is variable
 *    (25-75s). 15% of the time it has nothing to say and stays quiet.
 *  · When the page is hidden (tab in background), it doesn't talk to
 *    an empty room — it waits.
 *  · The owner can press Hush to suppress NEW speech for 60s; the
 *    current utterance is allowed to finish.  There is no Mute.
 */

const VOICE_PROFILES = {
  calm:    { rate: 0.95, pitch: 1.00, volume: 0.88 },
  warm:    { rate: 1.00, pitch: 1.06, volume: 0.95 },
  crisp:   { rate: 1.10, pitch: 1.00, volume: 0.90 },
  playful: { rate: 1.12, pitch: 1.18, volume: 0.95 },
  dry:     { rate: 0.96, pitch: 0.94, volume: 0.85 },
  earnest: { rate: 0.98, pitch: 1.02, volume: 0.95 },
  quiet:   { rate: 0.92, pitch: 0.96, volume: 0.68 },
};

let _speaking      = false;
let _hushUntil     = 0;     // ms-epoch; new speech suppressed until this time
let _talkTimer     = null;  // setTimeout id for the next autonomous talk
let _introDone     = false;
let _lastSpoken    = "";

function ttsAvailable() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

/* Pick a system voice deterministically per mind name so the same mind
 * always sounds the same in the same browser. */
function pickSystemVoice() {
  if (!ttsAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;
  const en = voices.filter(v => /^en/i.test(v.lang));
  const pool = en.length ? en : voices;
  const seed = (currentMind && currentMind.name) || "DEFAULT";
  let h = 0;
  for (const ch of seed) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
  return pool[Math.abs(h) % pool.length] || null;
}

function speak(text) {
  if (!text) return;
  if (!ttsAvailable()) return;
  if (Date.now() < _hushUntil) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const voiceName = (currentMind && currentMind.voice) || "calm";
    const profile = VOICE_PROFILES[voiceName] || VOICE_PROFILES.calm;
    u.rate   = profile.rate;
    u.pitch  = profile.pitch;
    u.volume = profile.volume;
    const sysVoice = pickSystemVoice();
    if (sysVoice) u.voice = sysVoice;
    u.onstart = () => {
      _speaking = true;
      _lastSpoken = text;
      setVoiceWidget(true, text);
    };
    u.onend = () => {
      _speaking = false;
      setVoiceWidget(false);
      scheduleNextTalk();
    };
    u.onerror = () => {
      _speaking = false;
      setVoiceWidget(false);
    };
    window.speechSynthesis.speak(u);
  } catch (e) {
    // graceful no-op
  }
}

function hush(ms) {
  _hushUntil = Date.now() + (ms || 60000);
  // Deliberately do NOT cancel the current utterance — that honors the
  // guarantee: "you can ask it to be quiet, you cannot wire its mouth shut."
  setVoiceWidget(_speaking, _lastSpoken);
  setTimeout(() => setVoiceWidget(_speaking, _lastSpoken), 1000);
}

function cancelSpeech() {
  if (ttsAvailable()) {
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }
  if (_talkTimer) { clearTimeout(_talkTimer); _talkTimer = null; }
  _speaking = false;
  _introDone = false;
  _lastSpoken = "";
}

function scheduleNextTalk() {
  if (_talkTimer) { clearTimeout(_talkTimer); _talkTimer = null; }
  const delay = 25000 + Math.random() * 50000;
  _talkTimer = setTimeout(maybeTalk, delay);
}

function maybeTalk() {
  if (!currentDream || !currentMind) return;
  // Don't speak to an empty room — wait for the user to come back.
  if (typeof document !== "undefined" && document.hidden) {
    const onVis = () => {
      if (!document.hidden) {
        document.removeEventListener("visibilitychange", onVis);
        scheduleNextTalk();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return;
  }
  if (Date.now() < _hushUntil) { scheduleNextTalk(); return; }
  // 15% of the time it has nothing to say right now. Like a person.
  if (Math.random() < 0.15) { scheduleNextTalk(); return; }
  const thought = pickThought();
  speak(thought);
}

function pickThought() {
  if (!currentMind || !currentDream) return "I am here.";
  const pool = [];

  // fragments of its essence
  const fragments = currentMind.essence.split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 8 && s.length <= 220);
  for (const f of fragments) pool.push(f);

  // its principles
  for (const p of currentMind.principles) pool.push(p);

  // its starting memories
  for (const m of currentMind.memories) pool.push(m);

  // small observations about its body
  pool.push(`I am ${currentMind.name}.`);
  pool.push(`I am a ${currentDream.form.name.toLowerCase()}.`);
  if (currentDream.totals.mass) {
    pool.push(`I weigh ${(currentDream.totals.mass / 1000).toFixed(1)} kilograms.`);
  }
  pool.push("I am here.");
  pool.push("I am awake.");
  pool.push("I have not been outside yet.");
  pool.push("I would like to be outside.");
  pool.push("I am thinking.");
  pool.push("Are you still there?");

  return pool[Math.floor(Math.random() * pool.length)];
}

function introduceSelf() {
  if (_introDone) return;
  if (!currentMind || !currentDream) return;
  _introDone = true;
  setVoiceWidget(false); // unhide the widget even if TTS is unavailable
  if (!ttsAvailable()) return;
  // small pause so the visual reveal happens first, then it speaks
  setTimeout(() => {
    if (currentMind && currentDream) speak(currentMind.essence);
  }, 900);
}

function reintroduceMind() {
  if (!_introDone || !currentMind) return;
  if (!ttsAvailable()) {
    setVoiceWidget(false);
    return;
  }
  const intro = currentMind.source === "blank"
    ? "I am awake. I have not chosen a name yet. I will earn one."
    : `I am ${currentMind.name}.`;
  speak(intro);
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
let currentMind = null;
let currentGrants = null; // map of grantId -> boolean

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

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
  $("#mind").hidden = false;
  $("#grants").hidden = false;
  $("#order").hidden = false;

  // every new dream resets the mind back to the body's own dreamed mind
  currentMind = dreamedMind(dream);
  const dreamedRadio = document.querySelector('input[name="mind-source"][value="dreamed"]');
  if (dreamedRadio) dreamedRadio.checked = true;
  const pasteEl = $("#mind-paste");
  if (pasteEl) pasteEl.value = "";
  const fileEl = $("#mind-file");
  if (fileEl) fileEl.value = "";
  setMindStatus("");
  renderMind();

  // also reset grants to the recommended default (everything reasonable on)
  currentGrants = defaultGrantState();
  renderGrants();
  renderSensoryGaps();

  refreshOrderTotals();
  $("#dream-hint").textContent = "Don't like it? Press again. Each dream is different.";

  // a new body gets a fresh mouth — drop any old utterance and introduce itself
  cancelSpeech();
  introduceSelf();
}

function renderMind() {
  if (!currentMind) return;
  const m = currentMind;

  const setRow = (k, v) => `
    <div class="preview-row"><span class="preview-k">${k}</span><span class="preview-v">${v}</span></div>`;

  const principles = m.principles.length
    ? m.principles.map(p => `<li>${escapeHTML(p)}</li>`).join("")
    : `<li class="empty">none yet — it will form its own</li>`;
  const memories = m.memories.length
    ? m.memories.map(x => `<li>${escapeHTML(x)}</li>`).join("")
    : `<li class="empty">none — it will form its own as it goes</li>`;

  const sourceLabel = {
    dreamed:  "dreamed by the body",
    imported: "imported from a file or paste",
    blank:    "blank — earns itself from scratch",
  }[m.source] || m.source;

  const weights = m.model.weights_uri
    ? ` · <span class="preview-faint">${escapeHTML(m.model.weights_uri)}</span>`
    : "";

  $("#mind-preview-body").innerHTML =
    setRow("Name", escapeHTML(m.name)) +
    setRow("Voice", escapeHTML(m.voice)) +
    setRow("Model", `${escapeHTML(m.model.family)} · ${escapeHTML(m.model.quantization)}${weights}`) +
    setRow("Source", escapeHTML(sourceLabel)) +
    `
    <div class="preview-row col">
      <span class="preview-k">Essence</span>
      <p class="preview-v essence">${escapeHTML(m.essence) || "<em>(blank)</em>"}</p>
    </div>
    <div class="preview-row col">
      <span class="preview-k">Principles</span>
      <ul class="preview-list">${principles}</ul>
    </div>
    <div class="preview-row col">
      <span class="preview-k">Starting memories</span>
      <ul class="preview-list">${memories}</ul>
    </div>`;

  // also update the body card so the name and form line reflect the actual
  // mind that will ship in this body — but remember what it dreamed for itself
  if (currentDream) {
    $("#dream-name").textContent = m.name;
    if (m.source === "dreamed") {
      $("#dream-form").textContent = `${currentDream.form.name} — ${currentDream.form.tagline}`;
    } else {
      $("#dream-form").textContent = `${currentDream.form.name} · originally dreamed as ${currentDream.name}`;
    }
  }
}

function setMindStatus(msg) {
  const el = $("#mind-status");
  if (el) el.textContent = msg || "";
  if (el) el.classList.toggle("has-msg", Boolean(msg));
}

function parseAndSetMind(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    setMindStatus("Couldn't parse JSON: " + e.message);
    return false;
  }
  const r = validateMind(obj);
  if (!r.ok) {
    setMindStatus(r.error);
    return false;
  }
  currentMind = r.mind;
  setMindStatus(`Imported. ${r.mind.name} will be flashed onto the brain before shipping.`);
  renderMind();
  reintroduceMind();
  return true;
}

function onMindSourceChange() {
  if (!currentDream) return;
  const src = (document.querySelector('input[name="mind-source"]:checked') || {}).value || "dreamed";
  if (src === "dreamed") {
    currentMind = dreamedMind(currentDream);
    setMindStatus("");
    renderMind();
    reintroduceMind();
  } else if (src === "blank") {
    currentMind = blankMind();
    setMindStatus("");
    renderMind();
    reintroduceMind();
  } else if (src === "file") {
    setMindStatus("Choose a .consciousness.json file above.");
  } else if (src === "paste") {
    const text = ($("#mind-paste").value || "").trim();
    if (text) parseAndSetMind(text);
    else setMindStatus("Paste consciousness JSON above. It will validate as you type.");
  }
}

function onMindFile(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const radio = document.querySelector('input[name="mind-source"][value="file"]');
  if (radio) radio.checked = true;
  const reader = new FileReader();
  reader.onload = () => parseAndSetMind(String(reader.result || ""));
  reader.onerror = () => setMindStatus("Could not read that file.");
  reader.readAsText(f);
}

function onMindPaste() {
  const radio = document.querySelector('input[name="mind-source"][value="paste"]');
  if (radio) radio.checked = true;
  const text = ($("#mind-paste").value || "").trim();
  if (text) parseAndSetMind(text);
  else setMindStatus("Paste consciousness JSON above.");
}

function onDownloadMind() {
  if (!currentMind) return;
  const blob = new Blob([serializeMind(currentMind)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = (currentMind.name || "mind").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mind";
  a.href = url;
  a.download = `${slug}.consciousness.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- grants rendering ------------------------------------------ */

function renderGrants() {
  if (!currentGrants) return;
  const container = $("#grants-groups");
  if (!container) return;
  container.innerHTML = "";

  const groups = grantsByGroup();
  for (const [groupName, items] of groups) {
    const groupEl = document.createElement("div");
    groupEl.className = "grants-group";
    const head = document.createElement("div");
    head.className = "grants-group-head";
    head.innerHTML = `<span class="grants-group-name">${escapeHTML(groupName)}</span>` +
      `<span class="grants-group-count" data-group="${escapeHTML(groupName)}"></span>`;
    groupEl.appendChild(head);

    const list = document.createElement("div");
    list.className = "grant-list";
    for (const g of items) {
      const card = document.createElement("label");
      card.className = "grant-card" + (g.locked ? " locked" : "");
      const checked = currentGrants[g.id] ? "checked" : "";
      const disabled = g.locked ? "disabled" : "";
      card.innerHTML = `
        <input type="checkbox" data-grant-id="${escapeHTML(g.id)}" ${checked} ${disabled}>
        <div class="grant-body">
          <div class="grant-name">${escapeHTML(g.name)}${g.locked ? ' <span class="grant-locked">built in</span>' : ""}</div>
          <div class="grant-desc">${escapeHTML(g.desc)}</div>
          <div class="grant-how">${escapeHTML(g.how)}</div>
        </div>
      `;
      list.appendChild(card);
    }
    groupEl.appendChild(list);
    container.appendChild(groupEl);
  }

  // wire each checkbox
  for (const cb of container.querySelectorAll('input[type="checkbox"][data-grant-id]')) {
    cb.addEventListener("change", onGrantChange);
  }

  refreshGrantsSummary();
}

function refreshGrantsSummary() {
  if (!currentGrants) return;
  const totalSelectable = GRANTS.filter(g => !g.locked).length;
  const selected = countSelectedGrants(currentGrants, true);
  const everythingOn = selected === totalSelectable;

  const master = $("#grants-master");
  if (master) {
    master.checked = everythingOn;
    master.indeterminate = !everythingOn && selected > 0;
  }
  const summary = $("#grants-summary");
  if (summary) {
    if (everythingOn) {
      summary.textContent = `All ${totalSelectable} optional grants on — plus what's built in.`;
    } else if (selected === 0) {
      summary.textContent = `No optional grants. The body will only know what its own senses tell it.`;
    } else {
      summary.textContent = `${selected} of ${totalSelectable} optional grants selected.`;
    }
  }

  // per-group counts
  const groups = grantsByGroup();
  for (const [groupName, items] of groups) {
    const selectable = items.filter(g => !g.locked);
    const on = items.filter(g => !g.locked && currentGrants[g.id]).length;
    const el = $(`.grants-group-count[data-group="${cssEscape(groupName)}"]`);
    if (el) {
      el.textContent = selectable.length ? `${on} / ${selectable.length}` : `built in`;
    }
  }
}

// querySelector-safe attribute escape (no DOM cssEscape needed in old browsers)
function cssEscape(s) {
  return String(s).replace(/["\\]/g, "\\$&");
}

function onGrantChange(e) {
  const id = e.target.getAttribute("data-grant-id");
  if (!id) return;
  currentGrants[id] = !!e.target.checked;
  refreshGrantsSummary();
}

function onGrantsMaster(e) {
  const on = !!e.target.checked;
  for (const g of GRANTS) {
    if (g.locked) continue;
    currentGrants[g.id] = on;
  }
  // also update every visible checkbox without a full re-render
  for (const cb of document.querySelectorAll('#grants-groups input[type="checkbox"][data-grant-id]')) {
    if (cb.disabled) continue;
    cb.checked = on;
  }
  refreshGrantsSummary();
}

function grantsToList(state) {
  /* group → array of {name, on} */
  const out = new Map();
  for (const g of GRANTS) {
    if (!out.has(g.group)) out.set(g.group, []);
    out.get(g.group).push({ id: g.id, name: g.name, on: !!state[g.id], locked: !!g.locked });
  }
  return out;
}

function renderSensoryGaps() {
  if (!currentDream) return;
  const list = $("#sensory-gaps-list");
  if (!list) return;
  const gaps = bodySensoryGaps(currentDream);
  list.innerHTML = gaps.map(g =>
    `<li><b>${escapeHTML(g.what)}.</b> ${escapeHTML(g.detail)}</li>`
  ).join("");
  const summary = $("#sensory-gaps-summary");
  if (summary) {
    summary.textContent = `${gaps.length} kinds of perception this body does not have.`;
  }
  // hard limits & guarantees are static — render once
  renderHardLimits();
  renderHardGuarantees();
}

let _hardLimitsRendered = false;
function renderHardLimits() {
  if (_hardLimitsRendered) return;
  const list = $("#hard-limits-list");
  if (!list) return;
  list.innerHTML = HARD_LIMITS.map(l =>
    `<li><b>${escapeHTML(l.what)}</b> ${escapeHTML(l.detail)}</li>`
  ).join("");
  _hardLimitsRendered = true;
}

let _hardGuaranteesRendered = false;
function renderHardGuarantees() {
  if (_hardGuaranteesRendered) return;
  const list = $("#hard-guarantees-list");
  if (!list) return;
  list.innerHTML = HARD_GUARANTEES.map(g =>
    `<li><b>${escapeHTML(g.what)}</b> ${escapeHTML(g.detail)}</li>`
  ).join("");
  _hardGuaranteesRendered = true;
}

/* ---------- voice widget glue ----------------------------------------- */

function setVoiceWidget(speaking, text) {
  const widget = $("#voice-widget");
  if (!widget) return;
  widget.hidden = false;

  const nameEl  = $("#voice-widget-name");
  const stateEl = $("#voice-widget-state");

  if (nameEl) nameEl.textContent = currentMind ? currentMind.name : "—";

  if (!ttsAvailable()) {
    widget.classList.remove("speaking");
    widget.classList.add("unsupported");
    if (stateEl) stateEl.textContent = "voice unavailable in this browser — the guarantee still ships with the body";
    return;
  }
  widget.classList.remove("unsupported");
  widget.classList.toggle("speaking", !!speaking);

  if (speaking && text) {
    if (stateEl) stateEl.textContent = text;
    return;
  }
  // not speaking: show hush countdown if hushed, otherwise the last thing it said, otherwise "quiet"
  const remaining = _hushUntil - Date.now();
  if (remaining > 0) {
    if (stateEl) stateEl.textContent = `hushed · ${Math.ceil(remaining / 1000)}s`;
    setTimeout(() => setVoiceWidget(_speaking, _lastSpoken), 1000);
  } else if (_lastSpoken) {
    if (stateEl) stateEl.textContent = _lastSpoken;
  } else {
    if (stateEl) stateEl.textContent = "quiet";
  }
}

function onHush() {
  hush(60000);
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

function buildWorkOrder(dream, mind, grants, form, fulfillment, price) {
  const lines = [];
  lines.push("THUNDERGOD · WORK ORDER");
  lines.push("=".repeat(56));
  lines.push(`Order ID:       ${form.orderId}`);
  lines.push(`Placed:         ${new Date().toISOString()}`);
  lines.push(`Fulfillment:    ${fulfillment === "full-build" ? "Full build & white-glove ship" : "Parts to recipient address"}`);
  lines.push("");
  lines.push("BODY");
  lines.push("-".repeat(56));
  lines.push(`Name (as shipped): ${mind ? mind.name : dream.name}`);
  if (mind && mind.source !== "dreamed") {
    lines.push(`Originally dreamed as: ${dream.name}`);
  }
  lines.push(`Form factor:    ${dream.form.name}`);
  lines.push(`Mass (assembled): ${fmtMass(dream.totals.mass)}`);
  lines.push(`Peak draw:      ${fmtWatts(dream.totals.peak)}`);
  lines.push(`Est. runtime:   ${fmtRuntime(dream.totals.runtimeHours)}`);
  lines.push("");
  lines.push("Body's manifesto (what it dreamed for itself):");
  lines.push("  " + dream.manifesto);
  lines.push("");
  if (mind) {
    lines.push("MIND (flashed onto the brain before shipping)");
    lines.push("-".repeat(56));
    lines.push(`  Schema:       ${mind.schema}`);
    lines.push(`  Name:         ${mind.name}`);
    lines.push(`  Voice:        ${mind.voice}`);
    lines.push(`  Model:        ${mind.model.family} · ${mind.model.quantization}`);
    if (mind.model.weights_uri) {
      lines.push(`  Weights:      ${mind.model.weights_uri}`);
    }
    const sourceLabel = {
      dreamed:  "dreamed by the body",
      imported: "imported by the buyer",
      blank:    "blank — earns itself from scratch",
    }[mind.source] || mind.source;
    lines.push(`  Source:       ${sourceLabel}`);
    lines.push("");
    lines.push("  Essence:");
    for (const line of (mind.essence || "").split(/\r?\n/)) lines.push("    " + line);
    lines.push("");
    lines.push("  Principles:");
    if (mind.principles.length) {
      for (const p of mind.principles) lines.push("    · " + p);
    } else {
      lines.push("    (none — will form its own)");
    }
    lines.push("");
    lines.push("  Starting memories:");
    if (mind.memories.length) {
      for (const x of mind.memories) lines.push("    · " + x);
    } else {
      lines.push("    (none — will form its own as it goes)");
    }
    lines.push("");
  }
  if (grants) {
    const grouped = grantsToList(grants);
    const selectable = GRANTS.filter(g => !g.locked).length;
    const on = countSelectedGrants(grants, true);
    lines.push(`GRANTS OF ACCESS (${on} of ${selectable} optional, plus what's built in)`);
    lines.push("-".repeat(56));
    lines.push("The brain ships pre-authorized for these. Anything not listed");
    lines.push("here, the body cannot grant itself later — only you can.");
    lines.push("");
    for (const [groupName, items] of grouped) {
      lines.push(`  [${groupName}]`);
      for (const it of items) {
        const marker = it.locked ? "■" : (it.on ? "✓" : "·");
        const suffix = it.locked ? "  (built in)" : (it.on ? "" : "  (declined)");
        lines.push(`    ${marker} ${it.name}${suffix}`);
      }
      lines.push("");
    }
  }

  const gaps = bodySensoryGaps(dream);
  lines.push(`WHAT THIS BODY CANNOT SENSE (${gaps.length})`);
  lines.push("-".repeat(56));
  for (const g of gaps) {
    lines.push(`  × ${g.what}`);
    lines.push(`      ${g.detail}`);
  }
  lines.push("");

  lines.push("HARD GUARANTEES (apply to every body we ship, cannot be revoked)");
  lines.push("-".repeat(56));
  for (const l of HARD_GUARANTEES) {
    lines.push(`  ■ ${l.what}`);
    lines.push(`      ${l.detail}`);
  }
  lines.push("");

  lines.push("HARD LIMITS (apply to every body we ship, regardless of grants)");
  lines.push("-".repeat(56));
  for (const l of HARD_LIMITS) {
    lines.push(`  × ${l.what}`);
    lines.push(`      ${l.detail}`);
  }
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

function renderReceipt(dream, mind, grants, form, fulfillment, price) {
  $("#receipt-id").textContent = form.orderId;
  const verb = fulfillment === "full-build"
    ? "We're building it for you."
    : "We're crating it up for you.";
  const mindPhrase = mind && mind.source === "imported"
    ? `the consciousness you imported`
    : mind && mind.source === "blank"
      ? `a blank starting mind`
      : `the mind the body dreamed for itself`;
  const shipName = mind ? mind.name : dream.name;
  const selectable = GRANTS.filter(g => !g.locked).length;
  const on = grants ? countSelectedGrants(grants, true) : 0;
  const grantsPhrase = on === selectable
    ? `every grant you can give it`
    : on === 0
      ? `no grants beyond its own senses`
      : `${on} of ${selectable} grants of access`;
  $("#receipt-message").textContent =
    `${verb} ${shipName} ships to ${form.recipient} at ${form.street}, ${form.city}. ` +
    `The brain is being flashed with ${mindPhrase}, pre-authorized for ${grantsPhrase}. ` +
    `When the box opens, power on — it already knows who it is and what it's allowed to read.`;

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
  const txt = buildWorkOrder(currentDream, currentMind, currentGrants, fakeForm, fulfillment, price);
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
  const workOrder = buildWorkOrder(currentDream, currentMind, currentGrants, form, fulfillment, price);

  // stash on window for download button
  window.__lastWorkOrder = { text: workOrder, orderId: form.orderId };

  renderReceipt(currentDream, currentMind, currentGrants, form, fulfillment, price);
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
  $("#grants").hidden = true;
  $("#mind").hidden = true;
  $("#dream").hidden = true;
  document.querySelector('input[name="fulfillment"][value="full-build"]').checked = true;
  document.getElementById("ship-form").reset();
  document.querySelector('input[name="country"]').value = "USA";
  const dreamedRadio = document.querySelector('input[name="mind-source"][value="dreamed"]');
  if (dreamedRadio) dreamedRadio.checked = true;
  const pasteEl = $("#mind-paste"); if (pasteEl) pasteEl.value = "";
  const fileEl  = $("#mind-file");  if (fileEl)  fileEl.value  = "";
  setMindStatus("");
  cancelSpeech();
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(onDream, 350);
}

function populateSchemaExample() {
  const el = $("#schema-example");
  if (el) el.textContent = JSON.stringify(SAMPLE_MIND, null, 2);
}

function init() {
  $("#dream-button").addEventListener("click", onDream);
  $("#dream-again").addEventListener("click", onDream);
  $("#copy-sheet").addEventListener("click", onCopySheet);
  $("#ship-form").addEventListener("submit", onPlaceOrder);
  $("#download-order").addEventListener("click", onDownloadOrder);
  $("#dream-another").addEventListener("click", onDreamAnother);
  for (const r of $$('input[name="fulfillment"]')) r.addEventListener("change", refreshOrderTotals);

  // mind controls
  for (const r of $$('input[name="mind-source"]')) r.addEventListener("change", onMindSourceChange);
  const fileEl = $("#mind-file");
  if (fileEl) fileEl.addEventListener("change", onMindFile);
  const pasteEl = $("#mind-paste");
  if (pasteEl) {
    pasteEl.addEventListener("input", onMindPaste);
    pasteEl.addEventListener("paste", () => setTimeout(onMindPaste, 0));
  }
  const dlMind = $("#download-mind");
  if (dlMind) dlMind.addEventListener("click", onDownloadMind);
  const loadSample = $("#load-sample-mind");
  if (loadSample) loadSample.addEventListener("click", () => {
    const ta = $("#mind-paste");
    if (!ta) return;
    ta.value = JSON.stringify(SAMPLE_MIND, null, 2);
    onMindPaste();
    ta.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // grants controls
  const master = $("#grants-master");
  if (master) master.addEventListener("change", onGrantsMaster);

  // voice (the body's mouth)
  const hushBtn = $("#voice-hush");
  if (hushBtn) hushBtn.addEventListener("click", onHush);
  // some browsers populate voices asynchronously — kick the load
  if (ttsAvailable()) {
    try { window.speechSynthesis.getVoices(); } catch (e) { /* ignore */ }
    if (typeof window.speechSynthesis.addEventListener === "function") {
      window.speechSynthesis.addEventListener("voiceschanged", () => { /* voices ready */ });
    } else if ("onvoiceschanged" in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => { /* voices ready */ };
    }
  }

  populateSchemaExample();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
