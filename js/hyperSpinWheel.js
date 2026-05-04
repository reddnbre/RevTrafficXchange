/**
 * Hyper Spin — CSS wheel (conic-gradient + transform). Single source: HyperSpin.rewards.
 * Prize index is chosen before animation; reward is applied only in onComplete — never from transform.
 */
const HyperSpinWheel = {
  isAnimating: false,
  /** Cumulative rotation (deg) per disk, for smooth repeat spins on the page. */
  _cumDeg: {},
  _transitionEndHandler: null,
  _failsafeTimer: null,

  getSegments() {
    return Array.isArray(HyperSpin.rewards) ? HyperSpin.rewards : [];
  },

  wedgeColors() {
    return ["#0f0d0b", "#151210", "#1a1612", "#221c16", "#1c1712", "#12100e"];
  },

  escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  },

  /** Map legacy canvasId / explicit diskId to rotating disk element id. */
  resolveDiskId(config) {
    const raw = (config && (config.diskId || config.canvasId)) || "";
    const s = String(raw);
    if (s.indexOf("modal") >= 0) return "hyperspin-modal-wheel-disk";
    return "hyperspin-page-wheel-disk";
  },

  /** segmentAngle and selectedCenter in degrees; clockwise from top, index 0 first wedge. */
  computeSelectedCenterDeg(winningIndex, n) {
    const segmentAngle = 360 / n;
    return winningIndex * segmentAngle + segmentAngle / 2;
  },

  /**
   * From current cumulative rotation, rotate so winningIndex lands under top pointer.
   * First spin from 0 matches: 360*6 + (360 - selectedCenter).
   */
  computeTargetRotationDeg(fromDeg, winningIndex, n) {
    const segmentAngle = 360 / n;
    const selectedCenter = winningIndex * segmentAngle + segmentAngle / 2;
    const from = Number(fromDeg) || 0;
    const remainder = ((360 - selectedCenter) - (from % 360) + 1080) % 360;
    return from + 360 * 6 + remainder;
  },

  buildConicGradient() {
    const segments = this.getSegments();
    const n = Math.max(1, segments.length);
    const colors = this.wedgeColors();
    const sa = 360 / n;
    const parts = [];
    for (let i = 0; i < n; i++) {
      const c = colors[i % colors.length];
      const a0 = i * sa;
      const a1 = (i + 1) * sa;
      parts.push(`${c} ${a0}deg ${a1}deg`);
    }
    return `conic-gradient(from 0deg at 50% 50%, ${parts.join(", ")})`;
  },

  renderLegendHTML(opts) {
    const segments = this.getSegments();
    const colors = this.wedgeColors();
    const hi = opts && opts.highlightIndex != null ? Number(opts.highlightIndex) : null;
    return `
      <ol class="rtx-hyper-legend" aria-label="Wheel segments, clockwise from top">
        ${segments
          .map((seg, i) => {
            const swatch = colors[i % colors.length];
            const label = this.escapeAttr(seg.label || "");
            const active = hi === i ? " rtx-hyper-legend-item--active" : "";
            return `
              <li class="rtx-hyper-legend-item${active}">
                <span class="rtx-hyper-legend-swatch" style="background:${swatch}" aria-hidden="true"></span>
                <span class="rtx-hyper-legend-label">${label}</span>
              </li>
            `;
          })
          .join("")}
      </ol>
    `;
  },

  /**
   * @param {{ diskId?: string, canvasId?: string, stageClass?: string, highlightIndex?: number|null }} config
   */
  renderHTML(config) {
    const cfg = config || {};
    const diskId = this.resolveDiskId(cfg);
    const compact = diskId.indexOf("modal") >= 0;
    const stageExtra = compact ? " rtx-hyper-wheel-stage--compact" : "";
    const legacyStage = cfg.stageClass ? String(cfg.stageClass) : "";
    const highlightIndex = cfg.highlightIndex != null ? cfg.highlightIndex : null;
    const legend = this.renderLegendHTML({ highlightIndex });
    const rot = Number(this._cumDeg[diskId]) || 0;
    const conic = this.buildConicGradient();

    return `
      <div class="rtx-hyper-wheel-ui">
        <div class="rtx-hyper-wheel-stage${stageExtra} ${legacyStage}">
          <div class="rtx-hyper-wheel-glow" aria-hidden="true"></div>
          <div class="rtx-hyper-ring rtx-hyper-ring--outer" aria-hidden="true"></div>
          <div class="rtx-hyper-ring rtx-hyper-ring--inner" aria-hidden="true"></div>
          <div class="rtx-hyper-wheel-frame">
            <div class="rtx-hyper-pointer" aria-hidden="true"></div>
            <div class="rtx-hyper-disk-clip">
              <div
                id="${diskId}"
                class="rtx-hyper-disk"
                style="transform: rotate(${rot}deg); background-image: ${conic};"
                aria-label="Hyper Spin prize wheel"
              >
                <div class="rtx-hyper-hub" aria-hidden="true">⚡</div>
              </div>
            </div>
          </div>
        </div>
        ${legend}
      </div>
    `;
  },

  resetModalWheel() {
    const id = "hyperspin-modal-wheel-disk";
    this._cumDeg[id] = 0;
    const el = typeof document !== "undefined" ? document.getElementById(id) : null;
    if (el) {
      el.style.transition = "none";
      el.style.transform = "rotate(0deg)";
    }
  },

  syncIdleWheels() {
    /* CSS wheel — no canvas redraw; optional future: sync if rewards hot-reload */
  },

  /**
   * @param {{ diskId?: string, canvasId?: string, winningIndex: number, segment: object, durationMs?: number, onComplete?: () => void }} opts
   */
  startSpin(opts) {
    const onComplete = opts && typeof opts.onComplete === "function" ? opts.onComplete : null;
    const diskId = this.resolveDiskId(opts || {});
    const winningIndex = opts && opts.winningIndex;
    const segment = opts && opts.segment;
    const segments = this.getSegments();
    const n = segments.length;

    if (this.isAnimating) return;
    if (typeof winningIndex !== "number" || !segment || winningIndex < 0 || winningIndex >= n) {
      if (onComplete) onComplete();
      return;
    }

    const el = document.getElementById(diskId);
    if (!el) {
      if (onComplete) onComplete();
      return;
    }

    this.isAnimating = true;
    const fromDeg = Number(this._cumDeg[diskId]) || 0;
    const toDeg = this.computeTargetRotationDeg(fromDeg, winningIndex, n);
    const durationMs = opts && Number(opts.durationMs) > 0 ? Number(opts.durationMs) : 4800;

    if (this._failsafeTimer) {
      clearTimeout(this._failsafeTimer);
      this._failsafeTimer = null;
    }
    if (this._transitionEndHandler) {
      el.removeEventListener("transitionend", this._transitionEndHandler);
      this._transitionEndHandler = null;
    }

    const ease = "cubic-bezier(0.12, 0.72, 0.12, 1)";

    el.style.transition = "none";
    el.style.transform = `rotate(${fromDeg}deg)`;
    void el.offsetHeight;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (this._failsafeTimer) {
        clearTimeout(this._failsafeTimer);
        this._failsafeTimer = null;
      }
      el.removeEventListener("transitionend", done);
      this._transitionEndHandler = null;
      this._cumDeg[diskId] = toDeg;
      this.isAnimating = false;
      if (typeof onComplete === "function") onComplete();
    };

    const done = (ev) => {
      if (ev && ev.propertyName && ev.propertyName !== "transform") return;
      finish();
    };

    this._transitionEndHandler = done;
    el.addEventListener("transitionend", done);
    this._failsafeTimer = setTimeout(finish, durationMs + 200);

    requestAnimationFrame(() => {
      el.style.transition = `transform ${durationMs}ms ${ease}`;
      el.style.transform = `rotate(${toDeg}deg)`;
    });
  }
};

window.HyperSpinWheel = HyperSpinWheel;
