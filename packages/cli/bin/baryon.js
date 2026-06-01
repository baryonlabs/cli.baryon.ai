#!/usr/bin/env node
// Baryon CLI entry. Built-in subcommands are handled locally; everything else
// is forwarded to the pi coding agent with the baryon.ai provider pre-selected.
import {
  setup,
  doctor,
  models,
  configCmd,
  keys,
  update,
  help,
  welcome,
} from "../src/commands.js";
import { loadConfig, piProviderConfigured, hasConfig } from "../src/config.js";
import { runPi, resolvePiEntry } from "../src/pi.js";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { c, err, log, sym } from "../src/ui.js";

const require = createRequire(import.meta.url);

function showVersion() {
  const self = require("../package.json").version;
  log(`@baryonlabs/cli ${c.lime("v" + self)}`);
  const entry = resolvePiEntry();
  if (entry) {
    const r = spawnSync(process.execPath, [entry, "--version"], {
      encoding: "utf8",
    });
    if (r.stdout) log(`pi ${c.dim(r.stdout.trim())}`);
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
            `  ${sym.warn} ${c.yellow("아직 설정되지 않았습니다.")} ${c.lime("baryon setup")} ${c.dim("을 먼저 실행합니다.")}\n`,
          );
          return setup([]);
        }
        log(
          `  ${sym.warn} ${c.yellow("설정이 없습니다.")} ${c.lime("baryon setup")} ${c.dim("을 먼저 실행하세요.")}`,
        );
        return 1;
      }
      const cfg = loadConfig();
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
