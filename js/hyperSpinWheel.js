/**
 * Hyper Spin wheel — Winwheel.js (MIT, https://github.com/zarocknz/javascript-winwheel )
 * + GSAP 2 TweenMax (required by Winwheel for spin animation).
 *
 * Colored segments only on canvas (no prize text on the wheel). Fixed legend below.
 * Prize is chosen before the spin; stopAngle comes from Winwheel.getRandomForSegment(winningIndex + 1).
 * applyReward uses the pre-picked segment only — never the segment indicated by canvas math after spin.
 */
const HyperSpinWheel = {
  isAnimating: false,
  _wheels: {},

  /** Segments clockwise from top pointer = HyperSpin.rewards[] order (Winwheel segment 1 = index 0). */
  getSegments() {
    return Array.isArray(HyperSpin.rewards) ? HyperSpin.rewards : [];
  },

  wedgeColors() {
    return ["#100e0c", "#171310", "#1f1a15", "#2a2118", "#241c14", "#1a1612"];
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
    /* Resizing canvas clears pixels — only write dimensions when they change (avoids breaking Winwheel / Tween). */
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

  getOrCreateWinwheel(canvasId) {
    const compact = this.isCompactCanvasId(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Winwheel === "undefined") return null;

    const existing = this._wheels[canvasId];
    if (existing && existing.canvas === canvas) {
      this._fitCanvas(canvas, compact);
      existing.centerX = canvas.width / 2;
      existing.centerY = canvas.height / 2;
      const outer = Math.floor(Math.min(canvas.width, canvas.height) / 2) - 6;
      existing.outerRadius = outer;
      existing.innerRadius = Math.max(32, Math.floor(outer * 0.14));
      existing.draw();
      return existing;
    }

    if (existing && typeof existing.stopAnimation === "function") {
      try {
        existing.stopAnimation(false);
      } catch (e) {}
    }
    delete this._wheels[canvasId];

    this._fitCanvas(canvas, compact);
    const rewards = this.getSegments();
    const colors = this.wedgeColors();
    const segOpts = rewards.map((_, i) => ({
      fillStyle: colors[i % colors.length],
      text: "",
      strokeStyle: "rgba(249,115,22,0.5)",
      lineWidth: 2
    }));

    const w = canvas.width;
    const h = canvas.height;
    const outer = Math.floor(Math.min(w, h) / 2) - 6;

    const wheel = new Winwheel(
      {
        canvasId,
        numSegments: Math.max(1, rewards.length),
        segments: segOpts,
        outerRadius: outer,
        innerRadius: Math.max(32, Math.floor(outer * 0.14)),
        centerX: w / 2,
        centerY: h / 2,
        pointerAngle: 0,
        drawText: false,
        lineWidth: 2,
        strokeStyle: "rgba(249,115,22,0.42)",
        clearTheCanvas: true
      },
      true
    );

    this._wheels[canvasId] = wheel;
    return wheel;
  },

  /** After App replaces DOM — draw idle wheels on Hyper Spin page / session modal. */
  syncIdleWheels() {
    if (this.isAnimating) return;
    if (typeof Winwheel === "undefined") return;
    try {
      if (typeof RTXState !== "undefined" && RTXState.currentView === "hyper-spin") {
        if (document.getElementById("hyperspin-page-wheel-canvas")) {
          this.getOrCreateWinwheel("hyperspin-page-wheel-canvas");
        }
      }
      if (typeof GameModal !== "undefined" && GameModal.visible && !GameModal.currentReward && !GameModal.animating) {
        if (document.getElementById("hyperspin-modal-wheel-canvas")) {
          this.getOrCreateWinwheel("hyperspin-modal-wheel-canvas");
        }
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

  /**
   * @param {{ canvasId?: string, diskId?: string, winningIndex: number, segment: object, onComplete?: () => void }} opts
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

    if (typeof Winwheel === "undefined" || typeof TweenMax === "undefined") {
      if (onComplete) onComplete();
      return;
    }

    const wheel = this.getOrCreateWinwheel(canvasId);
    if (!wheel) {
      if (onComplete) onComplete();
      return;
    }

    this.isAnimating = true;

    try {
      wheel.stopAnimation(false);
    } catch (e) {}

    let ra = Number(wheel.rotationAngle) || 0;
    ra = ((ra % 360) + 360) % 360;
    wheel.rotationAngle = ra;

    const segNum = winningIndex + 1;
    const stopAngle = wheel.getRandomForSegment(segNum);

    wheel.animation.type = "spinToStop";
    wheel.animation.spins = 6;
    wheel.animation.duration = 5.5;
    wheel.animation.stopAngle = stopAngle;
    wheel.animation.easing = "Power3.easeOut";
    wheel.animation.callbackFinished = () => {
      const indicated = typeof wheel.getIndicatedSegmentNumber === "function" ? wheel.getIndicatedSegmentNumber() : null;
      if (indicated != null && indicated !== segNum) {
        console.warn("[HyperSpinWheel] Pointer segment mismatch (payout still uses chosen segment)", {
          chosenSegNum: segNum,
          indicatedSegNum: indicated,
          winningLabel: segment.label
        });
      }
      this.isAnimating = false;
      if (typeof onComplete === "function") onComplete();
    };

    wheel.startAnimation();
  }
};

window.HyperSpinWheel = HyperSpinWheel;
