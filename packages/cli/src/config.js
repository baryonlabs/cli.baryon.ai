// Reads/writes Baryon config and merges a `baryon` provider into pi's
// ~/.pi/agent/models.json without clobbering the user's other providers.
import fs from "node:fs";
import path from "node:path";
import {
  API_KEY_ENV,
  BARYON_CONFIG,
  BARYON_DIR,
  DEFAULT_BASE_URL,
  DEFAULT_MODELS,
  PI_AGENT_DIR,
  PI_MODELS_JSON,
  PROVIDER,
} from "./constants.js";

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

/** Baryon config: { apiKey, baseUrl, defaultModel } */
export function loadConfig() {
  const cfg = readJson(BARYON_CONFIG, {});
  return {
    apiKey: process.env[API_KEY_ENV] || cfg.apiKey || "",
    baseUrl: process.env.BARYON_BASE_URL || cfg.baseUrl || DEFAULT_BASE_URL,
    defaultModel: cfg.defaultModel || DEFAULT_MODELS[0].id,
  };
}

export function saveConfig(patch) {
  const current = readJson(BARYON_CONFIG, {});
  const next = { ...current, ...patch };
  fs.mkdirSync(BARYON_DIR, { recursive: true, mode: 0o700 });
  writeJson(BARYON_CONFIG, next);
  try {
    fs.chmodSync(BARYON_CONFIG, 0o600);
  } catch {
    /* best effort on non-POSIX */
  }
  return next;
}

export function hasConfig() {
  return fs.existsSync(BARYON_CONFIG);
}

/**
 * Merge the baryon provider into pi's models.json. Preserves every other
 * provider already present. apiKey is stored as the `$BARYON_API_KEY`
 * interpolation token (never the literal key) so the key lives only in
 * ~/.baryon/config.json + the process env.
 */
export function syncPiModels({ baseUrl, models }) {
  const root = readJson(PI_MODELS_JSON, {});
  if (!root.providers || typeof root.providers !== "object") root.providers = {};

  root.providers[PROVIDER] = {
    name: "Baryon (baryon.ai)",
    baseUrl: baseUrl || DEFAULT_BASE_URL,
    api: "openai-completions",
    apiKey: `$${API_KEY_ENV}`,
    authHeader: true,
    models:
      Array.isArray(models) && models.length ? models : DEFAULT_MODELS,
  };

  fs.mkdirSync(PI_AGENT_DIR, { recursive: true });
  writeJson(PI_MODELS_JSON, root);
  return PI_MODELS_JSON;
}

export function piProviderConfigured() {
  const root = readJson(PI_MODELS_JSON, {});
  return Boolean(root?.providers?.[PROVIDER]);
}

export { PI_MODELS_JSON, BARYON_CONFIG };
