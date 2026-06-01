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

export const HOMEPAGE = "https://cli.baryon.ai";
export const SUPPORT_EMAIL = "support@baryon.ai";
