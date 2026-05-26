(function () {
  let rotationTick = 0;
  let rotationTimer = null;

  function getAds(kind) {
    if (typeof normalizeMemberCampaigns === "function") normalizeMemberCampaigns();
    const campaigns = RTXState.user && RTXState.user.memberCampaigns ? RTXState.user.memberCampaigns : {};
    const source = kind === "banner" ? campaigns.bannerAds : campaigns.textAds;
    const inventoryType = kind === "banner" ? "impressions" : "views";

    return (Array.isArray(source) ? source : []).filter((ad) => {
      if (!ad || !ad.active) return false;
      if (!String(ad.targetUrl || "").trim()) return false;
      if (kind === "banner" && !String(ad.imageUrl || "").trim()) return false;
      if (typeof getAvailableCampaignViews !== "function") return true;
      return getAvailableCampaignViews(ad, inventoryType) > 0;
    });
  }

  function escapeJs(value) {
    if (typeof SurfRail_escapeJs === "function") return SurfRail_escapeJs(value);
    return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  function escapeAttr(value) {
    if (typeof SurfRail_escapeAttr === "function") return SurfRail_escapeAttr(value);
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function pickRotatingAd(kind) {
    const ads = getAds(kind);
    if (!ads.length) return { ad: null, count: 0, index: 0 };
    const active = Math.max(0, Number(RTXState.activeCampaignIndex) || 0);
    const views = Math.max(0, Number(RTXState.user && RTXState.user.viewsToday) || 0);
    const offset = kind === "banner" ? 1 : 0;
    const index = (active + views + rotationTick + offset) % ads.length;
    return { ad: ads[index], count: ads.length, index };
  }

  function fallbackClick(url) {
    const target = String(url || "").trim();
    if (!target) return;
    window.open(target, "_blank", "noopener,noreferrer");
  }

  window.SurfRail_clickRotatingTextAd = function SurfRail_clickRotatingTextAd(id, url) {
    if (typeof TextAdsDisplayUI !== "undefined" && TextAdsDisplayUI && typeof TextAdsDisplayUI.clickAd === "function") {
      TextAdsDisplayUI.clickAd(id, url);
      return;
    }
    fallbackClick(url);
  };

  window.SurfRail_clickRotatingBannerAd = function SurfRail_clickRotatingBannerAd(id, url) {
    if (typeof BannerAdsDisplayUI !== "undefined" && BannerAdsDisplayUI && typeof BannerAdsDisplayUI.clickBanner === "function") {
      BannerAdsDisplayUI.clickBanner(id, url);
      return;
    }
    fallbackClick(url);
  };

  window.SurfRail_buildLeftColumnHtml = function SurfRail_buildRotatingTextHtml() {
    const picked = pickRotatingAd("text");
    if (picked.ad) {
      const label = picked.count > 1 ? `${picked.index + 1} / ${picked.count}` : "Live";
      return `<button type="button" class="surf-rail-slot surf-rail-slot--text surf-rail-slot--rotating panel" onclick="SurfRail_clickRotatingTextAd('${escapeJs(picked.ad.id)}','${escapeJs(picked.ad.targetUrl)}')"><span class="surf-rail-slot-meta">Rotating Text Ad <b>${label}</b></span><span class="surf-rail-slot-title" title="${escapeAttr(picked.ad.title)}">${escapeAttr(picked.ad.title)}</span><span class="surf-rail-slot-cta">Visit</span></button>`;
    }

    return `<button type="button" class="surf-rail-slot surf-rail-slot--placeholder surf-rail-slot--rotating panel" onclick="App.navigate('my-text-ads')"><span class="surf-rail-slot-meta">Rotating Text Ad</span><span class="surf-rail-slot-ph">Add your text ad to this rotation</span></button>`;
  };

  window.SurfRail_buildRightColumnHtml = function SurfRail_buildRotatingBannerHtml() {
    const picked = pickRotatingAd("banner");
    if (picked.ad) {
      const label = picked.count > 1 ? `${picked.index + 1} / ${picked.count}` : "Live";
      return `<button type="button" class="surf-rail-slot surf-rail-slot--banner surf-rail-slot--rotating panel" onclick="SurfRail_clickRotatingBannerAd('${escapeJs(picked.ad.id)}','${escapeJs(picked.ad.targetUrl)}')"><span class="surf-rail-slot-meta">Rotating Banner <b>${label}</b></span><img class="surf-rail-slot-img" src="${escapeAttr(picked.ad.imageUrl)}" alt="" loading="lazy" /></button>`;
    }

    return `<button type="button" class="surf-rail-slot surf-rail-slot--placeholder surf-rail-slot--banner-ph surf-rail-slot--rotating panel" onclick="App.navigate('my-banner-ads')"><span class="surf-rail-slot-meta">Rotating Banner</span><span class="surf-rail-slot-ph">Add your banner to this rotation</span></button>`;
  };

  function refreshRotatingRails() {
    const textRail = document.querySelector(".surf-ad-rail--left");
    const bannerRail = document.querySelector(".surf-ad-rail--right");
    if (textRail) textRail.innerHTML = window.SurfRail_buildLeftColumnHtml();
    if (bannerRail) bannerRail.innerHTML = window.SurfRail_buildRightColumnHtml();
  }

  function ensureRotationTimer() {
    if (rotationTimer) return;
    rotationTimer = window.setInterval(() => {
      if (RTXState.currentView !== "surf") return;
      rotationTick += 1;
      refreshRotatingRails();
    }, 8000);
  }

  if (typeof SurfEngine !== "undefined" && SurfEngine && typeof SurfEngine.patchSurfRuntimeUI === "function") {
    const originalPatchSurfRuntimeUI = SurfEngine.patchSurfRuntimeUI;
    SurfEngine.patchSurfRuntimeUI = function patchSurfRuntimeUIWithRotatingRails() {
      const result = originalPatchSurfRuntimeUI.apply(this, arguments);
      if (result) {
        refreshRotatingRails();
        ensureRotationTimer();
      }
      return result;
    };
  }

  if (typeof SurfPageComponent === "function") {
    const originalSurfPageComponent = SurfPageComponent;
    SurfPageComponent = function SurfPageComponentWithRotatingRails() {
      const html = originalSurfPageComponent.apply(this, arguments);
      window.setTimeout(() => {
        refreshRotatingRails();
        ensureRotationTimer();
      }, 0);
      return html;
    };
  }
})();
