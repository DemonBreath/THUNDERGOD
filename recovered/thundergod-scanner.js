/**
 * Camera-based QR scanner backed by jsQR.
 */
(function (global) {
  let stream = null;
  let rafId = null;
  let running = false;
  let video, canvas, ctx, statusEl;

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  async function start({ videoEl, canvasEl, statusElement, onDecode, onError }) {
    if (running) return;
    video = videoEl;
    canvas = canvasEl;
    statusEl = statusElement;
    ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (typeof jsQR === "undefined") {
      onError && onError(new Error("QR decoder not loaded."));
      return;
    }

    setStatus("Requesting camera…");
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
    } catch (err) {
      setStatus("Camera blocked or unavailable.");
      onError && onError(err);
      return;
    }

    video.srcObject = stream;
    video.setAttribute("playsinline", true);
    await video.play();
    running = true;
    setStatus("Looking for a QR code…");

    const tick = () => {
      if (!running) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data) {
          setStatus("QR detected.");
          stop();
          onDecode && onDecode(code.data);
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (video) {
      try { video.pause(); } catch (_) { /* ignore */ }
      video.srcObject = null;
    }
    setStatus("Camera idle.");
  }

  global.Scanner = {
    start,
    stop,
    get running() { return running; },
  };
})(typeof window !== "undefined" ? window : globalThis);
