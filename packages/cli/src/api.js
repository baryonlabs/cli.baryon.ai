// Minimal baryon.ai (OpenAI-compatible) helpers: model discovery + reachability.
import { DEFAULT_MODELS } from "./constants.js";

function joinUrl(base, suffix) {
  return base.replace(/\/+$/, "") + suffix;
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

export { DEFAULT_MODELS };
