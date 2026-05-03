/**
 * Hyper Spin wheel — colored wedges only (no text on rotating disk).
 * Visual segment order = clockwise from fixed top pointer = HyperSpin.rewards[] order (conic from 0deg).
 * Reward is chosen BEFORE animation; rotation is computed from winningIndex only (never from CSS).
 */
const HyperSpinWheel = {
  isAnimating: false,
  _fallbackTimer: null,

  /** Full spins before landing (spec). */
  FULL_ROTATIONS: 6,

  /**
   * Segments in exact visual order: index 0 is the wedge at the top, then clockwise.
   * Must match conic-gradient slice order in buildConicGradient (from 0deg at top).
   */
  getSegments() {
    return Array.isArray(HyperSpin.rewards) ? HyperSpin.rewards : [];
  },

  sliceCount() {
    return this.getSegments().length || 1;
  },

  wedgeColors() {
    return ["#100e0c", "#171310", "#1f1a15", "#2a2118", "#241c14", "#1a1612"];
  },

  buildConicGradient() {
    const colors = this.wedgeColors();
    const n = this.sliceCount();
    const slice = 360 / n;
    const parts = ["from 0deg"];
    for (let i = 0; i < n; i++) {
      const a0 = i * slice;
      const a1 = (i + 1) * slice;
      parts.push(`${colors[i % colors.length]} ${a0}deg ${a1}deg`);
    }
    return `conic-gradient(${parts.join(", ")})`;
  },

  escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  },

  /**
   * Fixed legend below wheel (does not rotate).
   * @param {{ highlightIndex?: number | null }} opts
   */
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

  /**
   * Rotating disk only — colored wedges, no text inside .hyperspin-wheel-disk.
   */
  renderHTML(config) {
    const diskId = config && config.diskId ? String(config.diskId) : "hyperspin-wheel-disk";
    const stageClass = config && config.stageClass ? String(config.stageClass) : "";
    const highlightIndex = config && config.highlightIndex != null ? config.highlightIndex : null;
    const gradient = this.buildConicGradient();
    const legend = this.renderLegendHTML({ highlightIndex });
    return `
      <div class="hyperspin-wheel-ui">
        <div class="hyperspin-wheel-stage ${stageClass}">
          <div class="hyperspin-wheel-glow" aria-hidden="true"></div>
          <div class="hyperspin-wheel-rim" aria-hidden="true"></div>
          <div class="hyperspin-wheel-disk-wrap">
            <div class="hyperspin-wheel-disk" id="${diskId}" role="img" aria-label="Hyper Spin prize wheel">
              <div class="hyperspin-wheel-face" style="background:${gradient}"></div>
            </div>
          </div>
          <div class="hyperspin-wheel-pointer" aria-hidden="true"></div>
        </div>
        ${legend}
      </div>
    `;
  },

  /**
   * Animate to pre-selected segment. Does not pick reward — caller applies segment after onComplete.
   * @param {{ diskId: string, winningIndex: number, segment: object, durationMs?: number, onComplete?: () => void }} opts
   */
  startSpin(opts) {
    const diskId = opts && opts.diskId;
    const winningIndex = opts && opts.winningIndex;
    const segment = opts && opts.segment;
    const durationMs = opts && Number(opts.durationMs) > 0 ? Number(opts.durationMs) : 4800;
    const onComplete = opts && typeof opts.onComplete === "function" ? opts.onComplete : null;

    if (this.isAnimating) return;

    const segments = this.getSegments();
    const n = segments.length;
    if (!diskId || !segment || typeof winningIndex !== "number" || winningIndex < 0 || winningIndex >= n) {
      if (onComplete) onComplete();
      return;
    }

    const wheel = document.getElementById(diskId);
    if (!wheel) {
      if (onComplete) onComplete();
      return;
    }

    const segmentAngle = 360 / n;
    const selectedCenterAngle = winningIndex * segmentAngle + segmentAngle / 2;
    const targetRotation = 360 - selectedCenterAngle;
    const finalRotation = 360 * this.FULL_ROTATIONS + targetRotation;

    console.log({
      winningIndex,
      winningLabel: segments[winningIndex].label,
      finalRotation
    });

    this.isAnimating = true;
    let finished = false;

    const done = () => {
      if (finished) return;
      finished = true;
      if (this._fallbackTimer) {
        clearTimeout(this._fallbackTimer);
        this._fallbackTimer = null;
      }
      wheel.removeEventListener("transitionend", onEnd);
      this.isAnimating = false;
      wheel.style.transition = "none";
      wheel.style.transform = `rotate(${finalRotation % 360}deg)`;
      void wheel.offsetWidth;
      if (onComplete) onComplete();
    };

    const onEnd = (ev) => {
      if (ev && ev.propertyName && ev.propertyName !== "transform") return;
      done();
    };

    if (this._fallbackTimer) {
      clearTimeout(this._fallbackTimer);
      this._fallbackTimer = null;
    }

    wheel.style.transition = "none";
    wheel.style.transform = "rotate(0deg)";
    void wheel.offsetWidth;

    wheel.style.transition = `transform ${durationMs / 1000}s cubic-bezier(0.18, 0.88, 0.24, 1)`;
    wheel.style.transform = `rotate(${finalRotation}deg)`;

    wheel.addEventListener("transitionend", onEnd);
    this._fallbackTimer = setTimeout(done, durationMs + 800);
  }
};

window.HyperSpinWheel = HyperSpinWheel;
