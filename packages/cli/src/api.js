// Minimal baryon.ai (OpenAI-compatible) helpers: model discovery + reachability.
import { CLIENT_VERSION, DEFAULT_MODELS } from "./constants.js";

function joinUrl(base, suffix) {
  return base.replace(/\/+$/, "") + suffix;
}

/** Compare two semver strings. -1 / 0 / 1, prerelease-insensitive. */
function cmpSemver(a, b) {
  const pa = String(a).split("-")[0].split(".").map(Number);
  const pb = String(b).split("-")[0].split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * Best-effort latest-version check against the npm registry. Returns
 * { current, latest, outdated } or null on any failure (offline / 폐쇄망 /
 * timeout / opt-out via BARYON_SKIP_UPDATE_CHECK). Never throws.
 */
export async function checkLatest({ timeoutMs = 2500 } = {}) {
  if (process.env.BARYON_SKIP_UPDATE_CHECK) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(
      "https://registry.npmjs.org/@baryonlabs/cli/latest",
      { signal: ctrl.signal, headers: { accept: "application/json" } },
    );
    if (!res.ok) return null;
    const latest = (await res.json())?.version;
    if (!latest) return null;
    return {
      current: CLIENT_VERSION,
      latest,
      outdated: cmpSemver(CLIENT_VERSION, latest) < 0,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch the institution's model catalog from `${baseUrl}/models`.
 * Returns pi-shaped model entries, or null when discovery fails
 * (offline / endpoint without a /models route).
 */
export async function discoverModels(baseUrl, apiKey, { timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(joinUrl(baseUrl, "/models"), {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const list = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : null;
    if (!list || !list.length) return null;
    return list.map((m) => ({
      id: m.id,
      name: m.name || m.id,
      reasoning: Boolean(m.reasoning),
      input: Array.isArray(m.input) ? m.input : ["text"],
      contextWindow: m.context_window || m.contextWindow || 128000,
      maxTokens: m.max_tokens || m.maxTokens || 8192,
    }));
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Lightweight reachability probe used by `baryon doctor`. */
export async function ping(baseUrl, apiKey, { timeoutMs = 6000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(joinUrl(baseUrl, "/models"), {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: ctrl.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e?.message || "network error" };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Resolve the connected project (분반) + seat for the configured key, so the CLI
 * can show which "room" it's in. Best-effort: null on any failure / offline.
 */
export async function whoami(baseUrl, apiKey, { timeoutMs = 4000 } = {}) {
  if (!apiKey) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(joinUrl(baseUrl, "/whoami"), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Baryon-Client": `baryon-cli/${CLIENT_VERSION}`,
      },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export { DEFAULT_MODELS };
