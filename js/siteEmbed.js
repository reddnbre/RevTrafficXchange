/**
 * Public site embed (Monetag verification meta, ad scripts, etc.).
 * Edit `window.RTX_SITE_EMBED` below, or replace this file from Admin → Monetag / Site embed → Export.
 * Loaded in <head> so verification tags run before the app.
 */
(function (global) {
  global.RTX_SITE_EMBED = Object.assign({ headHtml: "", bodyHtml: "" }, global.RTX_SITE_EMBED || {});

  function removeInjected() {
    try {
      document.querySelectorAll("[data-rtx-site-embed]").forEach(function (n) {
        n.remove();
      });
    } catch (e) {
      /* ignore */
    }
  }

  function cloneScript(el) {
    var s = document.createElement("script");
    for (var i = 0; i < el.attributes.length; i += 1) {
      var a = el.attributes[i];
      s.setAttribute(a.name, a.value);
    }
    s.textContent = el.textContent;
    s.setAttribute("data-rtx-site-embed", "1");
    return s;
  }

  function injectHead(html) {
    var h = String(html || "").trim();
    if (!h) return;
    var doc = new DOMParser().parseFromString("<!DOCTYPE html><html><head>" + h + "</head><body></body></html>", "text/html");
    Array.prototype.slice.call(doc.head.children).forEach(function (el) {
      if (el.tagName === "SCRIPT") {
        document.head.appendChild(cloneScript(el));
      } else {
        var c = el.cloneNode(true);
        c.setAttribute("data-rtx-site-embed", "1");
        document.head.appendChild(c);
      }
    });
  }

  function injectBody(html) {
    var h = String(html || "").trim();
    if (!h) return;
    var doc = new DOMParser().parseFromString("<!DOCTYPE html><html><head></head><body>" + h + "</body></html>", "text/html");
    Array.prototype.slice.call(doc.body.children).forEach(function (el) {
      if (el.tagName === "SCRIPT") {
        document.body.appendChild(cloneScript(el));
      } else {
        var c = el.cloneNode(true);
        c.setAttribute("data-rtx-site-embed", "1");
        document.body.appendChild(c);
      }
    });
  }

  function run(embed) {
    var e = embed && typeof embed === "object" ? embed : global.RTX_SITE_EMBED || {};
    removeInjected();
    injectHead(String(e.headHtml || ""));
    if (document.body) {
      injectBody(String(e.bodyHtml || ""));
    } else {
      document.addEventListener("DOMContentLoaded", function rtxSiteEmbedBody() {
        document.removeEventListener("DOMContentLoaded", rtxSiteEmbedBody);
        injectBody(String(e.bodyHtml || ""));
      });
    }
  }

  global.RTXSiteEmbedInject = {
    run: run,
    removeInjected: removeInjected
  };

  run(global.RTX_SITE_EMBED);
})(typeof window !== "undefined" ? window : this);
