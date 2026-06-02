import os from "node:os";
import path from "node:path";

/** Provider id registered inside pi's models.json */
export const PROVIDER = "baryon";

/** Default OpenAI-compatible endpoint for baryon.ai. Override with BARYON_BASE_URL. */
export const DEFAULT_BASE_URL =
  process.env.BARYON_BASE_URL || "https://api.baryon.ai/v1";

/** Env var pi resolves at request time (apiKey: "$BARYON_API_KEY"). */
export const API_KEY_ENV = "BARYON_API_KEY";

/** Underlying coding agent package + binary. */
export const PI_PACKAGE = "@earendil-works/pi-coding-agent";
export const PI_BIN = "pi";

/** Baryon-side config (api key, base url, default model). */
export const BARYON_DIR = path.join(os.homedir(), ".baryon");
export const BARYON_CONFIG = path.join(BARYON_DIR, "config.json");

/** pi's custom-provider/model registry. */
export const PI_AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
export const PI_MODELS_JSON = path.join(PI_AGENT_DIR, "models.json");

/**
 * Fallback model catalog used when /models discovery is unavailable
 * (e.g. offline setup). Institutions adjust these to match their plan.
 * `context` / `max` are conservative defaults; pi tolerates overrides.
 */
export const DEFAULT_MODELS = [
  {
    id: "baryon-coder",
    name: "Baryon Coder",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
  },
  {
    id: "baryon-coder-mini",
    name: "Baryon Coder Mini",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
  },
];

/**
 * Extensions installed by default so `baryon` ships with sub-agents, a canvas,
 * an interactive shell, and web access/fetch out of the box. Installed via
 * `pi install <src>` into ~/.pi/agent/settings.json (loaded on startup).
 */
export const DEFAULT_EXTENSIONS = [
  { name: "pi-subagents", src: "https://github.com/nicobailon/pi-subagents", note: "서브에이전트(작업 분해·위임·통합)" },
  { name: "pi-canvas", src: "https://github.com/jyaunches/pi-canvas", note: "캔버스" },
  { name: "pi-interactive-shell", src: "https://github.com/nicobailon/pi-interactive-shell", note: "인터랙티브 셸" },
  { name: "pi-web-access", src: "https://github.com/nicobailon/pi-web-access", note: "웹 액세스(브라우징)" },
  { name: "pi-web-fetch", src: "https://github.com/georgebashi/pi-web-fetch", note: "웹 페치" }
];

export const HOMEPAGE = "https://cli.baryon.ai";
export const SUPPORT_EMAIL = "support@baryon.ai";

/**
 * Where end users issue / rotate / revoke their baryon.ai key.
 * vibecamp.us is the source of truth for key issuance, scope, quota and
 * revocation. Keys look like `vc_live_…`. Override with BARYON_KEYS_URL.
 */
export const KEYS_URL = process.env.BARYON_KEYS_URL || "https://vibecamp.us/dashboard";
export const KEY_PREFIX = "vc_live_";
