/* THUNDERGOD — interactive procedural lightning */
(() => {
  "use strict";

  const sky = document.getElementById("sky");
  const bolts = document.getElementById("bolts");
  const sctx = sky.getContext("2d");
  const bctx = bolts.getContext("2d");

  const overlay = document.getElementById("overlay");
  const beginBtn = document.getElementById("begin");
  const hud = document.getElementById("hud");
  const chargeFill = document.getElementById("charge");
  const hudStrikes = document.getElementById("strikes");
  const hudStorm = document.getElementById("storm");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let W = 0;
  let H = 0;
  let DPR = 1;
  let stars = [];

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    for (const c of [sky, bolts]) {
      c.width = Math.floor(W * DPR);
      c.height = Math.floor(H * DPR);
      c.style.width = W + "px";
      c.style.height = H + "px";
      c.getContext("2d").setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.55,
      r: Math.random() * 1.1 + 0.2,
      tw: Math.random() * Math.PI * 2,
      sp: 0.6 + Math.random() * 1.2,
    }));
  }
  resize();
  window.addEventListener("resize", resize);

  // ---------- Lightning geometry ----------

  // Midpoint displacement: turn a straight line into a jagged path.
  // `displace` shrinks each pass, producing a fractal of decreasing roughness.
  function fractalLine(x1, y1, x2, y2, displace, detail = 7) {
    let pts = [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];
    for (let d = 0; d < detail; d++) {
      const next = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        // Perpendicular unit vector.
        const nx = -dy / len;
        const ny = dx / len;
        const off = (Math.random() - 0.5) * 2 * displace;
        next.push({ x: mx + nx * off, y: my + ny * off });
        next.push(p2);
      }
      pts = next;
      displace *= 0.55;
    }
    return pts;
  }

  function makeBolt(x1, y1, x2, y2, opts = {}) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const {
      displace = dist * 0.22,
      branchChance = 0.05,
      detail = 7,
      depth = 0,
      maxDepth = 3,
    } = opts;
    const main = fractalLine(x1, y1, x2, y2, displace, detail);
    const branches = [];
    if (depth < maxDepth) {
      for (let i = 1; i < main.length - 1; i++) {
        if (Math.random() < branchChance) {
          const p = main[i];
          const next = main[i + 1];
          const segAngle = Math.atan2(next.y - p.y, next.x - p.x);
          // Branch off the main direction by a random angle.
          const angle = segAngle + (Math.random() - 0.5) * 1.6;
          const len = (dist * (0.12 + Math.random() * 0.22)) / (depth + 1);
          const ex = p.x + Math.cos(angle) * len;
          const ey = p.y + Math.sin(angle) * len;
          branches.push(
            makeBolt(p.x, p.y, ex, ey, {
              displace: displace * 0.45,
              branchChance: branchChance * 0.65,
              detail: Math.max(3, detail - 2),
              depth: depth + 1,
              maxDepth,
            })
          );
        }
      }
    }
    return { main, branches };
  }

  // ---------- Live bolt rendering ----------

  const liveBolts = [];
  const sparks = [];

  function spawnStrike(x1, y1, x2, y2, power = 1) {
    const bolt = makeBolt(x1, y1, x2, y2);
    liveBolts.push({
      bolt,
      age: 0,
      life: 0.45 + Math.random() * 0.45,
      power,
      flicker: 0,
    });
    flashAmbient = Math.min(1.1, flashAmbient + 0.32 * power);
    const sparkCount = Math.floor(14 + power * 22);
    for (let i = 0; i < sparkCount; i++) spawnSpark(x2, y2);
    playThunder(power, Math.hypot(x2 - x1, y2 - y1));
    strikes++;
    hudStrikes.textContent = strikes;
  }

  function strokePath(points, w, style) {
    bctx.beginPath();
    bctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      bctx.lineTo(points[i].x, points[i].y);
    }
    bctx.lineWidth = w;
    bctx.strokeStyle = style;
    bctx.lineCap = "round";
    bctx.lineJoin = "round";
    bctx.stroke();
  }

  function drawBoltTree(tree, alpha, scale = 1) {
    // Four passes from broad-soft to thin-hot give a believable bloom on a
    // single canvas, without needing per-frame blur filters.
    strokePath(tree.main, 16 * scale, `rgba(90, 140, 255, ${0.07 * alpha})`);
    strokePath(tree.main, 8 * scale, `rgba(150, 190, 255, ${0.18 * alpha})`);
    strokePath(tree.main, 3 * scale, `rgba(215, 230, 255, ${0.6 * alpha})`);
    strokePath(tree.main, 1.2 * scale, `rgba(255, 255, 255, ${0.95 * alpha})`);
    for (const b of tree.branches) drawBoltTree(b, alpha * 0.85, scale * 0.62);
  }

  // ---------- Sparks ----------

  function spawnSpark(x, y) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const speed = 1 + Math.random() * 4.5;
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
    });
  }

  function updateSparks(dt) {
    const g = 0.18;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += g;
      s.vx *= 0.99;
      s.life -= s.decay;
      if (s.life <= 0 || s.y > H + 40) sparks.splice(i, 1);
    }
  }

  function drawSparks() {
    for (const s of sparks) {
      const a = Math.max(0, s.life);
      bctx.fillStyle = `rgba(220, 235, 255, ${a})`;
      bctx.beginPath();
      bctx.arc(s.x, s.y, 1.4, 0, Math.PI * 2);
      bctx.fill();
    }
  }

  // ---------- Sky ----------

  let flashAmbient = 0;
  let distantFlash = 0;
  let nextDistant = 2000 + Math.random() * 6000;

  function drawSky(t) {
    sctx.clearRect(0, 0, W, H);

    // Stars (twinkle).
    for (const s of stars) {
      const a = 0.35 + 0.45 * Math.sin(t * 0.001 * s.sp + s.tw);
      sctx.fillStyle = `rgba(220, 230, 255, ${Math.max(0, a) * 0.55})`;
      sctx.beginPath();
      sctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      sctx.fill();
    }

    // Moody cloud bands across the top half.
    const bands = 4;
    for (let i = 0; i < bands; i++) {
      const cy = H * (0.04 + i * 0.11);
      const cx = W / 2 + Math.sin(t * 0.00018 + i * 1.7) * (W * 0.18);
      const r = W * (0.55 + i * 0.05);
      const g = sctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const baseA = 0.55 - i * 0.09;
      g.addColorStop(0, `rgba(30, 40, 78, ${baseA})`);
      g.addColorStop(0.6, `rgba(15, 20, 44, ${baseA * 0.4})`);
      g.addColorStop(1, "rgba(5, 8, 18, 0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, W, H * 0.7);
    }

    // Horizon mist.
    const horizon = sctx.createLinearGradient(0, H * 0.6, 0, H);
    horizon.addColorStop(0, "rgba(10, 16, 38, 0)");
    horizon.addColorStop(1, "rgba(40, 55, 110, 0.45)");
    sctx.fillStyle = horizon;
    sctx.fillRect(0, H * 0.6, W, H * 0.4);

    // Flashes (close + distant) painted on top.
    const flash = Math.min(1, flashAmbient * 0.32 + distantFlash * 0.18);
    if (flash > 0.002) {
      sctx.fillStyle = `rgba(180, 205, 255, ${flash})`;
      sctx.fillRect(0, 0, W, H);
    }
  }

  // ---------- Audio (synthesized thunder) ----------

  let audioCtx = null;
  let muted = false;

  function getAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }

  function playThunder(power, distance) {
    if (muted) return;
    const ctx = getAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    // Sound travels: distant bolts arrive late.
    const travel = Math.min(0.55, distance / 3200);

    // Sharp initial crack.
    const crackDur = 0.18;
    const cBuf = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * crackDur),
      ctx.sampleRate
    );
    const cData = cBuf.getChannelData(0);
    for (let i = 0; i < cData.length; i++) {
      cData[i] = (Math.random() * 2 - 1) * (1 - i / cData.length);
    }
    const cSrc = ctx.createBufferSource();
    cSrc.buffer = cBuf;
    const cHp = ctx.createBiquadFilter();
    cHp.type = "highpass";
    cHp.frequency.value = 1200;
    const cGain = ctx.createGain();
    const cVol = 0.28 * power;
    cGain.gain.setValueAtTime(0.0001, now + travel);
    cGain.gain.exponentialRampToValueAtTime(cVol, now + travel + 0.005);
    cGain.gain.exponentialRampToValueAtTime(0.0001, now + travel + crackDur);
    cSrc.connect(cHp);
    cHp.connect(cGain);
    cGain.connect(ctx.destination);
    cSrc.start(now + travel);

    // Rolling rumble: filtered, decaying pink-ish noise.
    const rumbleDur = 1.4 + Math.random() * 1.6;
    const rBuf = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * rumbleDur),
      ctx.sampleRate
    );
    const rData = rBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < rData.length; i++) {
      // Cheap low-pass on noise to make it less hissy.
      const n = Math.random() * 2 - 1;
      last = last * 0.96 + n * 0.04;
      rData[i] = last * (1 - i / rData.length);
    }
    const rSrc = ctx.createBufferSource();
    rSrc.buffer = rBuf;
    const rLp = ctx.createBiquadFilter();
    rLp.type = "lowpass";
    rLp.frequency.value = 180 + Math.random() * 220;
    rLp.Q.value = 0.7;
    const rGain = ctx.createGain();
    const rVol = 0.55 * power;
    rGain.gain.setValueAtTime(0.0001, now + travel);
    rGain.gain.exponentialRampToValueAtTime(rVol, now + travel + 0.05);
    rGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + travel + rumbleDur
    );
    rSrc.connect(rLp);
    rLp.connect(rGain);
    rGain.connect(ctx.destination);
    rSrc.start(now + travel);
  }

  // ---------- Interaction ----------

  let strikes = 0;
  let charge = 0;
  let storming = false;
  let nextStormStrike = 0;
  let lastArcAt = 0;
  let dragging = false;
  let lastMouse = null;

  function pointerStrike(x, y, power = 1) {
    // Pick a downward origin somewhere above the click for a believable angle.
    const x1 = x + (Math.random() - 0.5) * W * 0.5;
    const y1 = -20 - Math.random() * 60;
    spawnStrike(x1, y1, x, y, power);
    charge = Math.max(0, charge - 0.18);
  }

  function arcStrike(x1, y1, x2, y2) {
    spawnStrike(x1, y1, x2, y2, 0.45 + Math.random() * 0.3);
  }

  bolts.addEventListener("pointerdown", (e) => {
    ensureStarted();
    dragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
    pointerStrike(e.clientX, e.clientY, 0.9 + Math.random() * 0.4);
  });

  window.addEventListener("pointerup", () => {
    dragging = false;
    lastMouse = null;
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    if (now - lastArcAt < 60) return;
    lastArcAt = now;
    if (lastMouse) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      if (Math.hypot(dx, dy) > 24) {
        arcStrike(lastMouse.x, lastMouse.y, e.clientX, e.clientY);
        lastMouse = { x: e.clientX, y: e.clientY };
      }
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "Space") {
      e.preventDefault();
      ensureStarted();
      storming = !storming;
      hudStorm.textContent = storming ? "tempest" : "calm";
    } else if (e.key === "m" || e.key === "M") {
      muted = !muted;
    } else if (e.key === "Enter") {
      ensureStarted();
    }
  });

  function ensureStarted() {
    if (!document.body.classList.contains("started")) {
      document.body.classList.add("started");
      hud.hidden = false;
      const ctx = getAudio();
      if (ctx && ctx.state === "suspended") ctx.resume();
    }
  }

  beginBtn.addEventListener("click", () => {
    ensureStarted();
    // Welcome strike from offscreen.
    const x = W * (0.3 + Math.random() * 0.4);
    spawnStrike(
      W / 2 + (Math.random() - 0.5) * W * 0.3,
      -40,
      x,
      H * 0.75,
      1.1
    );
  });

  // ---------- Main loop ----------

  let last = performance.now();

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Charge slowly builds; visual flair only.
    charge = Math.min(1, charge + dt * 0.08);
    chargeFill.style.width = (charge * 100).toFixed(1) + "%";

    // Storm mode: frequent random strikes.
    if (storming && now > nextStormStrike) {
      const x2 = Math.random() * W;
      const y2 = H * (0.55 + Math.random() * 0.35);
      const x1 = x2 + (Math.random() - 0.5) * W * 0.6;
      const y1 = -30 - Math.random() * 80;
      spawnStrike(x1, y1, x2, y2, 0.6 + Math.random() * 0.7);
      nextStormStrike = now + 180 + Math.random() * 700;
    }

    // Occasional distant flash even when calm.
    if (now > nextDistant && !prefersReducedMotion) {
      distantFlash = 0.35 + Math.random() * 0.45;
      nextDistant = now + 4000 + Math.random() * 9000;
    }

    flashAmbient = Math.max(0, flashAmbient - dt * 1.3);
    distantFlash = Math.max(0, distantFlash - dt * 1.6);

    drawSky(now);

    bctx.clearRect(0, 0, W, H);
    for (let i = liveBolts.length - 1; i >= 0; i--) {
      const b = liveBolts[i];
      b.age += dt;
      if (b.age >= b.life) {
        liveBolts.splice(i, 1);
        continue;
      }
      // Snappy decay + a touch of flicker on the way down.
      const t01 = b.age / b.life;
      const fade = (1 - t01) * (1 - t01);
      const flicker = 0.85 + Math.random() * 0.15;
      drawBoltTree(b.bolt, fade * flicker * b.power);
    }
    updateSparks(dt);
    drawSparks();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
