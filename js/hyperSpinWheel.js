/**
 * Hyper Spin — custom canvas wheel (no Winwheel / no GSAP).
 * Segment i = HyperSpin.rewards[i], drawn clockwise from top (same as fixed legend).
 * Prize is chosen before spin; we only animate to that index. applyReward uses the pre-picked segment.
 */
const HyperSpinWheel = {
  isAnimating: false,
  /** Cumulative rotation (radians), monotonic — used for smooth spins. */
  _cumRot: {},
  /** Increment to cancel in-flight RAF when a new spin starts (should not happen). */
  _spinToken: 0,

  TWO_PI: Math.PI * 2,

  getSegments() {
    return Array.isArray(HyperSpin.rewards) ? HyperSpin.rewards : [];
  },

  wedgeColors() {
    return ["#100e0c", "#171310", "#1f1a15", "#2a2118", "#241c14", "#1a1612"];
  },

  normalizeRad(r) {
    const t = this.TWO_PI;
    return ((r % t) + t) % t;
  },

  escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  },

  renderLegendHTML(opts) {
    const segments = this.getSegments();
    const colors = this.wedgeColors();
    const hi = opts && opts.highlightIndex != null ? Number(opts.highlightIndex) : null;
    return `
      <ol class="hyperspin-legend" aria-label="Wheel segments, clockwise from top">
        ${segments
          .map((seg, i) => {
            const swatch = colors[i % colors.length];
            const label = this.escapeAttr(seg.label || "");
            const active = hi === i ? " hyperspin-legend-item--active" : "";
            return `
              <li class="hyperspin-legend-item${active}">
                <span class="hyperspin-legend-swatch" style="background:${swatch}" aria-hidden="true"></span>
                <span class="hyperspin-legend-label">${label}</span>
              </li>
            `;
          })
          .join("")}
      </ol>
    `;
  },

  isCompactCanvasId(canvasId) {
    return String(canvasId).indexOf("modal") >= 0;
  },

  _fitCanvas(canvas, compact) {
    const dpr = typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1;
    const vw = typeof window !== "undefined" ? window.innerWidth : 800;
    const cssPx = Math.floor(Math.min(compact ? 460 : 580, compact ? vw * 0.9 : vw * 0.95));
    const px = Math.max(240, Math.floor(cssPx * Math.min(dpr, 2)));
    if (canvas.width === px && canvas.height === px && canvas.dataset.rtxCssPx === String(cssPx)) {
      return;
    }
    canvas.dataset.rtxCssPx = String(cssPx);
    canvas.style.width = `${cssPx}px`;
    canvas.style.height = `${cssPx}px`;
    canvas.style.display = "block";
    canvas.style.margin = "0 auto";
    canvas.width = px;
    canvas.height = px;
  },

  /** Pointer at canvas top = -π/2 (same convention as arc start at top). */
  _computeTargetRotation(fromRad, winningIndex, n, fullSpins) {
    const slice = this.TWO_PI / n;
    const centerRad = -Math.PI / 2 + (winningIndex + 0.5) * slice;
    const pointerRad = -Math.PI / 2;
    const base = fromRad + fullSpins * this.TWO_PI;
    let extra = this.normalizeRad(pointerRad - centerRad - base);
    if (extra < 1e-5) extra += this.TWO_PI;
    return base + extra;
  },

  drawWheel(canvasId, rotationRad) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const compact = this.isCompactCanvasId(canvasId);
    this._fitCanvas(canvas, compact);

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const outer = Math.min(w, h) / 2 - 6;
    const inner = Math.max(28, outer * 0.14);
    const rewards = this.getSegments();
    const n = Math.max(1, rewards.length);
    const colors = this.wedgeColors();
    const slice = this.TWO_PI / n;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRad);

    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * slice;
      const a1 = -Math.PI / 2 + (i + 1) * slice;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a0) * inner, Math.sin(a0) * inner);
      ctx.arc(0, 0, outer, a0, a1, false);
      ctx.arc(0, 0, inner, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(249,115,22,0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  },

  syncIdleWheels() {
    if (this.isAnimating) return;
    try {
      if (typeof RTXState !== "undefined" && RTXState.currentView === "hyper-spin") {
        const c = document.getElementById("hyperspin-page-wheel-canvas");
        if (c) this.drawWheel("hyperspin-page-wheel-canvas", this._cumRot["hyperspin-page-wheel-canvas"] || 0);
      }
      if (typeof GameModal !== "undefined" && GameModal.visible && !GameModal.currentReward && !GameModal.animating) {
        const c = document.getElementById("hyperspin-modal-wheel-canvas");
        if (c) this.drawWheel("hyperspin-modal-wheel-canvas", this._cumRot["hyperspin-modal-wheel-canvas"] || 0);
      }
    } catch (e) {}
  },

  renderHTML(config) {
    const cfg = config || {};
    const canvasId =
      cfg.canvasId ||
      (String(cfg.diskId || "").indexOf("modal") >= 0 ? "hyperspin-modal-wheel-canvas" : "hyperspin-page-wheel-canvas");
    const stageClass = cfg.stageClass ? String(cfg.stageClass) : "";
    const highlightIndex = cfg.highlightIndex != null ? cfg.highlightIndex : null;
    const legend = this.renderLegendHTML({ highlightIndex });
    return `
      <div class="hyperspin-wheel-ui">
        <div class="hyperspin-wheel-stage ${stageClass}">
          <div class="hyperspin-wheel-glow" aria-hidden="true"></div>
          <div class="hyperspin-wheel-rim" aria-hidden="true"></div>
          <div class="hyperspin-wheel-canvas-box">
            <div class="hyperspin-wheel-pointer" aria-hidden="true"></div>
            <canvas id="${canvasId}" class="hyperspin-wheel-canvas" width="560" height="560" aria-label="Hyper Spin prize wheel"></canvas>
          </div>
        </div>
        ${legend}
      </div>
    `;
  },

  _easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  },

  /**
   * @param {{ canvasId?: string, diskId?: string, winningIndex: number, segment: object, durationMs?: number, onComplete?: () => void }} opts
   */
  startSpin(opts) {
    const onComplete = opts && typeof opts.onComplete === "function" ? opts.onComplete : null;
    const canvasId =
      (opts && opts.canvasId) ||
      (opts && String(opts.diskId || "").indexOf("modal") >= 0 ? "hyperspin-modal-wheel-canvas" : "hyperspin-page-wheel-canvas");
    const winningIndex = opts && opts.winningIndex;
    const segment = opts && opts.segment;
    const segments = this.getSegments();
    const n = segments.length;

    if (this.isAnimating) return;
    if (typeof winningIndex !== "number" || !segment || winningIndex < 0 || winningIndex >= n) {
      if (onComplete) onComplete();
      return;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      if (onComplete) onComplete();
      return;
    }

    this.isAnimating = true;
    this._spinToken += 1;
    const token = this._spinToken;

    const compact = this.isCompactCanvasId(canvasId);
    this._fitCanvas(canvas, compact);

    const fromR = this._cumRot[canvasId] || 0;
    const toR = this._computeTargetRotation(fromR, winningIndex, n, 6);
    const durationMs = opts && Number(opts.durationMs) > 0 ? Number(opts.durationMs) : 4800;
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();

    const frame = (now) => {
      if (token !== this._spinToken) return;
      const t = Math.min(1, (now - t0) / durationMs);
      const e = this._easeOutCubic(t);
      const r = fromR + (toR - fromR) * e;
      this.drawWheel(canvasId, r);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        this._cumRot[canvasId] = toR;
        this.isAnimating = false;
        if (typeof onComplete === "function") onComplete();
      }
    };
    requestAnimationFrame(frame);
  }
};

window.HyperSpinWheel = HyperSpinWheel;
