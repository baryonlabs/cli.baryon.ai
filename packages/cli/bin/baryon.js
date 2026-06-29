#!/usr/bin/env node
// Baryon CLI entry. Built-in subcommands are handled locally; everything else
// is forwarded to the pi coding agent with the baryon.ai provider pre-selected.
import {
  setup,
  doctor,
  models,
  configCmd,
  keys,
  extensions,
  skills,
  edge,
  update,
  help,
  welcome,
} from "../src/commands.js";
import { loadConfig, piProviderConfigured, hasConfig, prunePiPackages } from "../src/config.js";
import { DEPRECATED_EXTENSIONS } from "../src/constants.js";
import { runPi, resolvePiEntry } from "../src/pi.js";
import { checkLatest, whoami } from "../src/api.js";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { c, err, log, sym } from "../src/ui.js";
import { t } from "../src/i18n.js";

/** Best-effort: warn loudly when a newer CLI exists. The gateway enforces the
 *  minimum version (426), so cloud use is blocked until you update; this is the
 *  friendly heads-up. Silent when offline / opted out. */
async function warnIfOutdated() {
  const r = await checkLatest();
  if (r?.outdated) {
    log(
      `\n  ${sym.warn} ${c.yellow(t("bin.outdated", { current: r.current, latest: r.latest }))}\n` +
        `  ${c.dim(t("bin.outdatedSub"))} ${c.lime("baryon update")} ${c.dim(t("bin.outdatedRun") + "\n")}`,
    );
  }
}

const require = createRequire(import.meta.url);

function showVersion() {
  const self = require("../package.json").version;
  log(`@baryonlabs/cli ${c.lime("v" + self)}`);
  const entry = resolvePiEntry();
  if (entry) {
    const r = spawnSync(process.execPath, [entry, "--version"], {
      encoding: "utf8",
    });
    if (r.stdout) log(t("bin.piVersion", { version: c.dim(r.stdout.trim()) }));
  }
  return 0;
}

const argv = process.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);

async function main() {
  switch (cmd) {
    case "setup":
    case "login":
    case "init":
      return setup(rest);
    case "doctor":
      return doctor();
    case "models":
      return models(rest);
    case "config":
      return configCmd(rest);
    case "keys":
    case "key":
      return keys();
    case "extensions":
    case "ext":
      return extensions(rest);
    case "skills":
    case "skill":
      return skills(rest);
    case "edge":
      return edge(rest);
    case "update":
    case "upgrade":
      return update();
    case "_welcome": // internal: postinstall hint
      return welcome();
    case "help":
    case "--help":
    case "-h":
      return help();
    case "version":
    case "--version":
    case "-v":
      return showVersion();
    default: {
      // Everything else → pi. Nudge to setup if nothing is configured yet.
      const unconfigured =
        !hasConfig() && !piProviderConfigured() && !process.env.BARYON_API_KEY;
      const userTargets = argv.some((a) =>
        ["--provider", "--model", "--api-key"].includes(a),
      );
      if (unconfigured && !userTargets) {
        if (process.stdin.isTTY) {
          log(
            `  ${sym.warn} ${c.yellow(t("bin.unconfiguredTTY"))} ${c.lime("baryon setup")} ${c.dim(t("bin.unconfiguredTTYRun"))}\n`,
          );
          return setup([]);
        }
        log(
          `  ${sym.warn} ${c.yellow(t("bin.unconfigured"))} ${c.lime("baryon setup")} ${c.dim(t("bin.unconfiguredRun"))}`,
        );
        return 1;
      }
      await warnIfOutdated();
      // Self-heal: drop extensions known to hard-fail startup on current pi
      // (conflicts / removed deps) so a plain `baryon` run isn't broken.
      try {
        const pruned = prunePiPackages(DEPRECATED_EXTENSIONS);
        if (pruned.length)
          log(`  ${sym.info} ${c.dim(t("bin.prunedConflicts", { names: pruned.join(", ") }))}`);
      } catch {
        /* best-effort */
      }
      const cfg = loadConfig();
      // Show which room (project/분반 · seat) this key is in — best-effort.
      try {
        const who = await whoami(cfg.baseUrl, cfg.apiKey);
        if (who?.project) {
          const key = who.project_status === "active" ? "bin.room" : "bin.roomInactive";
          log(`  ${c.teal(t(key, { project: who.project, seat: who.seat || "—" }))}`);
        }
      } catch {
        /* best-effort */
      }
      return runPi(argv, cfg);
    }
  }
}

main()
  .then((code) => process.exit(typeof code === "number" ? code : 0))
  .catch((e) => {
    err(e?.message || String(e));
    process.exit(1);
  });
