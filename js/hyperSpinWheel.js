/**
 * Futuristic prize wheel UI + spin animation for Hyper Spin (page + session modal).
 * Depends on global `HyperSpin` (rewards list).
 */
const HyperSpinWheel = {
  isAnimating: false,
  _fallbackTimer: null,

  sliceCount() {
    return Array.isArray(HyperSpin.rewards) ? HyperSpin.rewards.length : 6;
  },

  buildConicGradient() {
    /* Warm dark wedges + orange-brown accents — matches site :root (--bg / --orange). */
    const colors = ["#100e0c", "#171310", "#1f1a15", "#2a2118", "#241c14", "#1a1612"];
    const n = this.sliceCount();
    const slice = 360 / n;
    /* 0deg must be top (12 o'clock) so wedge index i matches rotation math in startSpin(). from -90deg shifts wedges 90° off the pointer. */
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

  /** Full prize line for wedge text (matches outcome copy). */
  prizeLabel(reward) {
    if (!reward) return "?";
    if (reward.label) return String(reward.label).trim();
    if (reward.type === "credits") return `+${reward.value} Credits`;
    if (reward.type === "multiplier") return `${reward.value}× Multiplier`;
    if (reward.type === "none") return "No Bonus";
    return "?";
  },

  /**
   * @param {{ diskId: string, stageClass?: string }} config
   */
  renderHTML(config) {
    const diskId = config && config.diskId ? String(config.diskId) : "hyperspin-wheel-disk";
    const stageClass = config && config.stageClass ? String(config.stageClass) : "";
    const rewards = HyperSpin.rewards;
    const n = rewards.length;
    const slice = 360 / n;
    const gradient = this.buildConicGradient();
    const labels = rewards
      .map((r, i) => {
        const center = i * slice + slice / 2;
        const text = this.escapeAttr(this.prizeLabel(r));
        return `<div class="hyperspin-wheel-wedge-label" style="--hyperspin-a:${center}deg"><span>${text}</span></div>`;
      })
      .join("");
    return `
      <div class="hyperspin-wheel-stage ${stageClass}">
        <div class="hyperspin-wheel-glow" aria-hidden="true"></div>
        <div class="hyperspin-wheel-rim" aria-hidden="true"></div>
        <div class="hyperspin-wheel-disk-wrap">
          <div class="hyperspin-wheel-disk" id="${diskId}" role="img" aria-label="Hyper Spin prize wheel">
            <div class="hyperspin-wheel-face" style="background:${gradient}"></div>
            <div class="hyperspin-wheel-labels">${labels}</div>
            <div class="hyperspin-wheel-hub" aria-hidden="true">
              <span class="hyperspin-wheel-hub-text">⚡</span>
            </div>
          </div>
        </div>
        <div class="hyperspin-wheel-pointer" aria-hidden="true"></div>
      </div>
    `;
  },

  /**
   * @param {{ diskId: string, rewardIndex: number, reward: object, durationMs?: number, onComplete?: (r: object) => void }} opts
   */
  startSpin(opts) {
    const diskId = opts && opts.diskId;
    const rewardIndex = opts && opts.rewardIndex;
    const reward = opts && opts.reward;
    const durationMs = opts && Number(opts.durationMs) > 0 ? Number(opts.durationMs) : 4800;
    const onComplete = opts && typeof opts.onComplete === "function" ? opts.onComplete : null;

    if (this.isAnimating) return;

    const wheel = diskId ? document.getElementById(diskId) : null;
    if (!wheel || typeof rewardIndex !== "number" || !reward) {
      if (onComplete) onComplete(reward);
      return;
    }

    this.isAnimating = true;
    let finished = false;

    const n = this.sliceCount();
    const slice = 360 / n;
    const centerDeg = slice * (rewardIndex + 0.5);
    const alignToTop = (360 - (centerDeg % 360)) % 360;
    const minTurns = 5;
    const maxTurns = 8;
    const fullTurns = minTurns + Math.floor(Math.random() * (maxTurns - minTurns + 1));
    const targetDeg = fullTurns * 360 + alignToTop;

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
      wheel.style.transform = `rotate(${targetDeg % 360}deg)`;
      void wheel.offsetWidth;
      if (onComplete) onComplete(reward);
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
    wheel.style.transform = `rotate(${targetDeg}deg)`;

    wheel.addEventListener("transitionend", onEnd);
    this._fallbackTimer = setTimeout(done, durationMs + 800);
  }
};

window.HyperSpinWheel = HyperSpinWheel;
