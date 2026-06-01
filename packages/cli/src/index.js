// Programmatic API for @baryonlabs/cli.
//
//   import { configure, run, discover } from "@baryonlabs/cli";
//
// Lets host apps register the baryon provider and launch pi without shelling
// out to the `baryon` binary.
import { discoverModels, ping } from "./api.js";
import {
  loadConfig,
  saveConfig,
  syncPiModels,
  piProviderConfigured,
} from "./config.js";
import { DEFAULT_BASE_URL, DEFAULT_MODELS, PROVIDER } from "./constants.js";
import { runPi, resolvePiEntry } from "./pi.js";

/**
 * Configure the baryon provider: persist key/baseUrl, discover (or default)
 * models, and write pi's models.json. Returns the resolved config + model ids.
 */
export async function configure({ apiKey, baseUrl = DEFAULT_BASE_URL } = {}) {
  if (apiKey) saveConfig({ apiKey, baseUrl });
  const models = (apiKey && (await discoverModels(baseUrl, apiKey))) || DEFAULT_MODELS;
  saveConfig({ defaultModel: models[0].id });
  syncPiModels({ baseUrl, models });
  return { baseUrl, models: models.map((m) => m.id), defaultModel: models[0].id };
}

/** Launch pi with the current baryon config. Resolves to the exit code. */
export function run(args = []) {
  return runPi(args, loadConfig());
}

export {
  loadConfig,
  saveConfig,
  discoverModels as discover,
  ping,
  piProviderConfigured,
  resolvePiEntry,
  PROVIDER,
  DEFAULT_BASE_URL,
  DEFAULT_MODELS,
};
