// RevTrafficXchange backend switch.
// The Worker API stores shared member state and shared surf ad rotation data.
window.RTX_BACKEND_CONFIG = window.RTX_BACKEND_CONFIG || {
  enabled: true,
  baseUrl: "https://revtrafficxchange-api.reddnbre.workers.dev",
  tokenStorageKey: "rtx_api_token_v1"
};
