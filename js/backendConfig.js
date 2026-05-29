// RevTrafficXchange backend switch.
// Set enabled to true after deploying the Cloudflare Worker API.
// If the Worker is routed on the same domain, leave baseUrl as "".
// If the Worker uses workers.dev, set baseUrl to that full origin, for example:
// https://revtrafficxchange-api.yourname.workers.dev
window.RTX_BACKEND_CONFIG = window.RTX_BACKEND_CONFIG || {
  enabled: false,
  baseUrl: "",
  tokenStorageKey: "rtx_api_token_v1"
};
