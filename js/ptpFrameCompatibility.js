(function () {
  if (typeof SurfPageComponent !== "function") return;

  const originalSurfPageComponent = SurfPageComponent;

  SurfPageComponent = function PtpCompatibleSurfPageComponent() {
    let html = originalSurfPageComponent.apply(this, arguments);

    html = html.replace(
      'class="panel surf-viewer-panel"',
      'class="panel surf-viewer-panel surf-viewer-panel--frame-compatible"'
    );

    html = html.replace('loading="lazy"', 'loading="eager"');
    html = html.replace(
      'referrerpolicy="no-referrer"',
      'referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; autoplay; encrypted-media"'
    );

    return html;
  };
})();
