// Resolves the bundled pi binary and launches it with the baryon provider
// pre-selected and BARYON_API_KEY injected into the environment.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  API_KEY_ENV,
  PI_BIN,
  PI_PACKAGE,
  PROVIDER,
  SESSION_ID_ENV,
  CLIENT_ENV,
  CLIENT_VERSION,
} from "./constants.js";
import { ensurePiSessionHeader } from "./config.js";
import { t } from "./i18n.js";

const require = createRequire(import.meta.url);

/** Find the package root (dir holding the matching package.json) above a file. */
function findPackageRoot(startFile, name) {
  let dir = path.dirname(startFile);
  for (let i = 0; i < 8; i++) {
    const pj = path.join(dir, "package.json");
    if (fs.existsSync(pj)) {
      try {
        if (JSON.parse(fs.readFileSync(pj, "utf8")).name === name) return dir;
      } catch {
        /* keep walking */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Absolute path to pi's entry script (dist/cli.js), or null if not installed.
 * pi's `exports` map hides ./package.json, so we resolve its main entry and
 * walk up to the package root to read `bin.pi`.
 */
export function resolvePiEntry() {
  try {
    // pi's "." export only defines `import` (ESM), so the CJS require.resolve
    // fails with ERR_PACKAGE_PATH_NOT_EXPORTED. Prefer the ESM resolver.
    let main;
    try {
      main = fileURLToPath(import.meta.resolve(PI_PACKAGE));
    } catch {
      main = require.resolve(PI_PACKAGE);
    }
    const root = findPackageRoot(main, PI_PACKAGE) || path.dirname(main);
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    );
    const rel =
      typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.[PI_BIN] || pkg.bin?.pi;
    if (!rel) return null;
    return path.join(root, rel);
  } catch {
    return null;
  }
}

const TARGETING_FLAGS = ["--provider", "--model", "--api-key"];

/** True if the user already chose a provider/model/key themselves. */
function userOverridesTargeting(args) {
  return args.some((a) => TARGETING_FLAGS.includes(a));
}

/**
 * Launch pi. By default injects `--provider baryon` (and the configured
 * default model) plus the API key env, while passing every other arg through
 * untouched. If the user supplies their own --provider/--model/--api-key we
 * leave targeting entirely to them (so model comparison still works).
 *
 * @returns {Promise<number>} pi's exit code
 */
export function runPi(args, config, { injectTargeting = true } = {}) {
  const entry = resolvePiEntry();
  if (!entry) {
    return Promise.reject(new Error(t("pi.notInstalled", { pkg: PI_PACKAGE })));
  }

  const finalArgs = [...args];
  if (injectTargeting && !userOverridesTargeting(args)) {
    finalArgs.unshift("--provider", PROVIDER);
    if (config.defaultModel) {
      finalArgs.unshift("--model", `${PROVIDER}/${config.defaultModel}`);
    }
  }

  const env = { ...process.env };
  if (config.apiKey) env[API_KEY_ENV] = config.apiKey;
  if (config.baseUrl) env.BARYON_BASE_URL = config.baseUrl;

  // One session per launch: mint an id (unless the caller pinned one) and make
  // sure the provider forwards it + this CLI's version. The gateway requires a
  // session id and enforces a minimum CLI version.
  if (!env[SESSION_ID_ENV]) env[SESSION_ID_ENV] = `cli_${randomUUID()}`;
  env[CLIENT_ENV] = `baryon-cli/${CLIENT_VERSION}`;
  ensurePiSessionHeader();

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...finalArgs], {
      stdio: "inherit",
      env,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      resolve(code ?? 0);
    });
  });
}
