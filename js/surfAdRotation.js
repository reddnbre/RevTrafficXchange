(function () {
  let rotationTick = 0;
  let rotationTimer = null;

  function getStoragePrefix() {
    return typeof RTXUserPersist !== "undefined" && RTXUserPersist ? RTXUserPersist.keyPrefix : "rtx_user_state_v1";
  }

  function getCurrentRecordOwnerId() {
    return String(
      typeof getCurrentUserId === "function" ? getCurrentUserId() : RTXState.user && RTXState.user.id ? RTXState.user.id : "member"
    );
  }

  function getStorageUserRecords() {
    const records = [];
    const addRecord = (ownerId, data, storageKey) => {
      if (!data || typeof data !== "object") return;
      records.push({ ownerId: String(ownerId || data.id || "member"), data, storageKey: storageKey || "" });
    };

    addRecord(getCurrentRecordOwnerId(), RTXState.user, "");

    try {
      const prefix = getStoragePrefix();
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(`${prefix}:`)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        const ownerId = String(data && data.id ? data.id : key.slice(prefix.length + 1));
        addRecord(ownerId, data, key);
      }
    } catch (e) {
      /* localStorage may be unavailable; current user record still works. */
    }

    return records;
  }

  function hasRemaining(ad, usedKey) {
    if (typeof getAvailableCampaignViews === "function") {
      return getAvailableCampaignViews(ad, usedKey) > 0;
    }
    const allocated = Math.max(0, Number(ad && ad.allocatedViews) || 0);
    if (!allocated) return true;
    const used = Math.max(0, Number(ad && ad[usedKey]) || 0);
    return used < allocated;
  }

  function getExchangeAds(kind) {
    if (typeof normalizeMemberCampaigns === "function") normalizeMemberCampaigns();
    const usedKey = kind === "banner" ? "impressions" : "views";
    const seen = new Set();
    const ads = [];

    getStorageUserRecords().forEach((record) => {
      const campaigns = record.data && record.data.memberCampaigns ? record.data.memberCampaigns : {};
      const source = kind === "banner" ? campaigns.bannerAds : campaigns.textAds;
      (Array.isArray(source) ? source : []).forEach((ad, index) => {
        if (!ad || !ad.active) return;
        if (!String(ad.targetUrl || "").trim()) return;
        if (kind === "banner" && !String(ad.imageUrl || "").trim()) return;
        if (!hasRemaining(ad, usedKey)) return;

        const id = String(ad.id || `${kind}-${index}`);
        const ownerId = String(ad.ownerId || record.ownerId || "member");
        const key = `${kind}:${ownerId}:${id}`;
        if (seen.has(key)) return;
        seen.add(key);

        ads.push({
          ...ad,
          id,
          ownerId,
          title: String(ad.title || (kind === "banner" ? "Member Banner" : "Member Text Ad")),
          description: String(ad.description || "Member promotion in the surf exchange"),
          targetUrl: String(ad.targetUrl || ""),
          imageUrl: String(ad.imageUrl || ""),
          isExchangeMemberAd: true
        });
      });
    });

    return ads;
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
    const ads = getExchangeAds(kind);
    if (!ads.length) return { ad: null, count: 0, index: 0 };
    const active = Math.max(0, Number(RTXState.activeCampaignIndex) || 0);
    const views = Math.max(0, Number(RTXState.user && RTXState.user.viewsToday) || 0);
    const offset = kind === "banner" ? 1 : 0;
    const index = (active + views + rotationTick + offset) % ads.length;
    return { ad: ads[index], count: ads.length, index };
  }

  function findRotatingAdRecord(kind, ownerId, id) {
    const sourceKey = kind === "banner" ? "bannerAds" : "textAds";
    const owner = String(ownerId || "");
    const adId = String(id || "");
    const records = getStorageUserRecords();

    for (let r = 0; r < records.length; r += 1) {
      const record = records[r];
      const campaigns = record.data && record.data.memberCampaigns ? record.data.memberCampaigns : {};
      const source = Array.isArray(campaigns[sourceKey]) ? campaigns[sourceKey] : [];
      for (let i = 0; i < source.length; i += 1) {
        const ad = source[i];
        const currentId = String(ad && ad.id ? ad.id : `${kind}-${i}`);
        const currentOwner = String(ad && ad.ownerId ? ad.ownerId : record.ownerId || "member");
        if (currentId === adId && (!owner || currentOwner === owner || String(record.ownerId) === owner)) {
          return { record, campaigns, source, sourceKey, index: i, ad };
        }
      }
    }

    return null;
  }

  function persistRotatingAdRecord(match) {
    if (!match || !match.record || !match.record.data) return;
    const currentOwnerId = getCurrentRecordOwnerId();
    if (match.record.data === RTXState.user || String(match.record.ownerId) === currentOwnerId) {
      if (typeof RTXUserPersist !== "undefined" && RTXUserPersist && typeof RTXUserPersist.save === "function") {
        RTXUserPersist.save();
      }
      return;
    }

    try {
      const key = match.record.storageKey || `${getStoragePrefix()}:${match.record.ownerId}`;
      localStorage.setItem(key, JSON.stringify(match.record.data));
    } catch (e) {
      /* If storage is blocked, still let the click open. */
    }
  }

  function openAndTrackRotatingAd(kind, id, ownerId, url) {
    const target = String(url || "").trim();
    if (!target) return;
    const usedKey = kind === "banner" ? "impressions" : "views";
    const match = findRotatingAdRecord(kind, ownerId, id);

    if (match && match.ad && hasRemaining(match.ad, usedKey)) {
      const nextAd = {
        ...match.ad,
        clicks: Math.max(0, Number(match.ad.clicks) || 0) + 1
      };
      if (kind === "banner") {
        nextAd.impressions = Math.max(0, Number(match.ad.impressions) || 0) + 1;
      } else {
        nextAd.views = Math.max(0, Number(match.ad.views) || 0) + 1;
      }
      match.source[match.index] = nextAd;
      match.campaigns[match.sourceKey] = match.source;
      match.record.data.memberCampaigns = match.campaigns;
      persistRotatingAdRecord(match);
      refreshRotatingRails();
    }

    window.open(target, "_blank", "noopener,noreferrer");
  }

  window.SurfRail_clickRotatingTextAd = function SurfRail_clickRotatingTextAd(id, ownerId, url) {
    openAndTrackRotatingAd("text", id, ownerId, url);
  };

  window.SurfRail_clickRotatingBannerAd = function SurfRail_clickRotatingBannerAd(id, ownerId, url) {
    openAndTrackRotatingAd("banner", id, ownerId, url);
  };

  function fallbackNavigate(view) {
    if (typeof App !== "undefined" && App && typeof App.navigate === "function") App.navigate(view);
  }

  window.SurfRail_buildLeftColumnHtml = function SurfRail_buildRotatingTextHtml() {
    const picked = pickRotatingAd("text");
    if (!picked.ad) {
      return `<button type="button" class="surf-rail-slot surf-rail-slot--text surf-rail-slot--rotating surf-rail-slot--available panel" onclick="App.navigate('my-text-ads')"><span class="surf-rail-slot-meta">Text Slot <b>Available</b></span><span class="surf-rail-slot-title">Advertise here</span><span class="surf-rail-slot-desc">Your text ad can rotate through surf views.</span></button>`;
    }

    const label = picked.count > 1 ? `${picked.index + 1} / ${picked.count}` : "Live";
    const description = picked.ad.description ? `<span class="surf-rail-slot-desc">${escapeAttr(picked.ad.description)}</span>` : "";
    return `<button type="button" class="surf-rail-slot surf-rail-slot--text surf-rail-slot--rotating panel" onclick="SurfRail_clickRotatingTextAd('${escapeJs(picked.ad.id)}','${escapeJs(picked.ad.ownerId)}','${escapeJs(picked.ad.targetUrl)}')"><span class="surf-rail-slot-meta">Text Ad <b>${label}</b></span><span class="surf-rail-slot-title" title="${escapeAttr(picked.ad.title)}">${escapeAttr(picked.ad.title)}</span>${description}<span class="surf-rail-slot-cta">Visit</span></button>`;
  };

  window.SurfRail_buildRightColumnHtml = function SurfRail_buildRotatingBannerHtml() {
    const picked = pickRotatingAd("banner");
    if (!picked.ad) {
      return `<button type="button" class="surf-rail-slot surf-rail-slot--banner surf-rail-slot--rotating surf-rail-slot--available panel" onclick="App.navigate('my-banner-ads')"><span class="surf-rail-slot-meta">Banner Slot <b>Available</b></span><span class="surf-generated-banner surf-generated-banner--available"><strong>Advertise Here</strong><em>Member banner rotation</em></span></button>`;
    }

    const label = picked.count > 1 ? `${picked.index + 1} / ${picked.count}` : "Live";
    return `<button type="button" class="surf-rail-slot surf-rail-slot--banner surf-rail-slot--rotating panel" onclick="SurfRail_clickRotatingBannerAd('${escapeJs(picked.ad.id)}','${escapeJs(picked.ad.ownerId)}','${escapeJs(picked.ad.targetUrl)}')"><span class="surf-rail-slot-meta">Banner <b>${label}</b></span><img class="surf-rail-slot-img" src="${escapeAttr(picked.ad.imageUrl)}" alt="" loading="lazy" /></button>`;
  };

  function refreshRotatingRails() {
    const textRail = document.querySelector(".surf-ad-rail--left");
    const bannerRail = document.querySelector(".surf-ad-rail--right");
    if (textRail) {
      textRail.innerHTML = window.SurfRail_buildLeftColumnHtml();
      textRail.classList.remove("surf-ad-rail--empty");
    }
    if (bannerRail) {
      bannerRail.innerHTML = window.SurfRail_buildRightColumnHtml();
      bannerRail.classList.remove("surf-ad-rail--empty");
    }
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
