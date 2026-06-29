// Built-in baryon subcommands. Anything not matched here is passed to pi.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkLatest, discoverModels, ping } from "./api.js";
import {
  hasConfig,
  loadConfig,
  piProviderConfigured,
  prunePiPackages,
  saveConfig,
  syncPiModels,
  BARYON_CONFIG,
  PI_MODELS_JSON,
} from "./config.js";
import { spawnSync } from "node:child_process";
import {
  DEFAULT_BASE_URL,
  DEFAULT_EXTENSIONS,
  DEFAULT_MODELS,
  DEFAULT_SKILLS,
  DEPRECATED_EXTENSIONS,
  HOMEPAGE,
  KEYS_URL,
  KEY_PREFIX,
  PI_PACKAGE,
  PI_SKILLS_DIR,
  PROVIDER,
  SKILLS_REPO,
  SUPPORT_EMAIL,
} from "./constants.js";
import { runPi, resolvePiEntry } from "./pi.js";
import { banner, c, info, log, ok, err, warn, prompt, promptHidden, sym } from "./ui.js";
import { t, normalizeLocale, getLocale } from "./i18n.js";

/** Parse `--flag value` / `--flag=value` pairs out of argv. */
function parseFlags(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) out[a.slice(2, eq)] = a.slice(eq + 1);
      else if (args[i + 1] && !args[i + 1].startsWith("-"))
        out[a.slice(2)] = args[++i];
      else out[a.slice(2)] = true;
    }
  }
  return out;
}

export async function setup(args) {
  const flags = parseFlags(args);
  banner();
  log(c.bold(`  ${t("setup.title")}\n`));

  const existing = loadConfig();
  const baseUrl = flags["base-url"] || existing.baseUrl || DEFAULT_BASE_URL;

  let apiKey = flags.key || flags["api-key"] || process.env.BARYON_API_KEY || "";
  if (!apiKey) {
    // Tell the user where keys come from before asking for one.
    log(`  ${sym.info} ${t("setup.keyHint", { url: c.lime(KEYS_URL) })}`);
    log(`  ${c.dim(t("setup.keyHintSub", { prefix: KEY_PREFIX }))}\n`);
    apiKey = await promptHidden(`  ${sym.info} ${t("setup.keyPrompt")}`);
  }
  if (!apiKey) {
    warn(t("setup.noKey"));
  } else if (!apiKey.startsWith(KEY_PREFIX)) {
    warn(t("setup.badKeyFormat", { prefix: KEY_PREFIX }));
  }

  saveConfig({ apiKey, baseUrl });
  ok(t("setup.configSaved", { file: c.dim(BARYON_CONFIG) }));

  // Try live model discovery; fall back to defaults offline.
  let models = null;
  if (apiKey) {
    info(t("setup.discovering"));
    models = await discoverModels(baseUrl, apiKey);
  }
  if (models) {
    ok(t("setup.modelsFound", {
      count: models.length,
      list: c.lime(models.map((m) => m.id).slice(0, 4).join(", ")),
      more: models.length > 4 ? "…" : "",
    }));
  } else {
    models = DEFAULT_MODELS;
    warn(t("setup.modelsFailed", { count: models.length }));
  }

  saveConfig({ defaultModel: models[0].id });
  const file = syncPiModels({ baseUrl, models });
  ok(t("setup.providerConfigured", { provider: c.lime(PROVIDER), file: c.dim(file) }));

  if (flags["no-extensions"]) {
    info(t("setup.skipExtensions"));
  } else {
    installDefaults();
  }

  if (flags["no-skills"]) {
    info(t("setup.skipSkills"));
  } else {
    installSkills();
  }

  if (flags["no-browser"]) {
    info(t("setup.skipBrowser"));
  } else {
    installBrowser();
  }

  log(`\n  ${sym.ok} ${t("setup.done", { cmd: c.lime("baryon") })}\n`);
  return 0;
}

export async function doctor() {
  banner();
  log(c.bold(`  ${t("doctor.title")}\n`));
  let problems = 0;

  // node
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 22) ok(t("doctor.node", { version: process.version }));
  else {
    err(t("doctor.nodeOld", { version: process.version }));
    problems++;
  }

  // pi installed?
  const entry = resolvePiEntry();
  if (entry) ok(t("doctor.piInstalled", { pkg: PI_PACKAGE }));
  else {
    err(t("doctor.piMissing", { pkg: PI_PACKAGE }));
    problems++;
  }

  // config?
  if (hasConfig()) ok(t("doctor.configFound", { file: c.dim(BARYON_CONFIG) }));
  else {
    warn(t("doctor.configMissing"));
    problems++;
  }

  const cfg = loadConfig();
  if (cfg.apiKey) ok(t("doctor.apiKeySet", { masked: `${cfg.apiKey.slice(0, 4)}${"•".repeat(6)}` }));
  else warn(t("doctor.apiKeyMissing"));

  // CLI version currency (best-effort; silent offline)
  const ver = await checkLatest();
  if (ver?.outdated) {
    warn(t("doctor.cliOutdated", { current: ver.current, latest: ver.latest }));
    problems++;
  } else if (ver) {
    ok(t("doctor.cliCurrent", { current: ver.current }));
  }

  // pi provider registered?
  if (piProviderConfigured()) ok(t("doctor.providerRegistered", { provider: c.lime(PROVIDER), file: c.dim(PI_MODELS_JSON) }));
  else {
    warn(t("doctor.providerMissing"));
    problems++;
  }

  // default skills present? (informational — not a failure)
  const haveSkills = DEFAULT_SKILLS.filter((s) =>
    fs.existsSync(path.join(PI_SKILLS_DIR, s.name, "SKILL.md")),
  ).length;
  if (haveSkills === DEFAULT_SKILLS.length)
    ok(t("doctor.skillsAll", { have: haveSkills, total: DEFAULT_SKILLS.length }));
  else
    info(t("doctor.skillsSome", { have: haveSkills, total: DEFAULT_SKILLS.length }));

  // agent-browser (web/ERP automation) — informational
  const ab = spawnSync("agent-browser", ["--version"], { encoding: "utf8" });
  if (ab.status === 0) ok(t("doctor.browserInstalled", { version: (ab.stdout || "").trim() || "ok" }));
  else info(t("doctor.browserMissing"));

  // connectivity
  info(t("doctor.checkingConn", { url: c.dim(cfg.baseUrl) }));
  const r = await ping(cfg.baseUrl, cfg.apiKey);
  if (r.ok) ok(t("doctor.connOk", { status: r.status }));
  else if (r.status) warn(t("doctor.connStatus", { status: r.status }));
  else warn(t("doctor.connFail", { error: r.error }));

  log(
    problems === 0
      ? `\n  ${sym.ok} ${c.teal(t("doctor.allPass"))}\n`
      : `\n  ${sym.warn} ${c.yellow(t("doctor.problems", { count: problems }))}\n`,
  );
  return problems === 0 ? 0 : 1;
}

export async function models(args) {
  const cfg = loadConfig();
  // Delegate to pi's own --list-models so output matches the real catalog.
  return runPi(["--list-models", ...args], cfg, { injectTargeting: false });
}

export async function configCmd(args) {
  const flags = parseFlags(args);
  if (flags.key || flags["api-key"] || flags["base-url"] || flags.model || flags.lang) {
    const patch = {};
    if (flags.key || flags["api-key"]) patch.apiKey = flags.key || flags["api-key"];
    if (flags["base-url"]) patch.baseUrl = flags["base-url"];
    if (flags.model) patch.defaultModel = flags.model;
    if (flags.lang) patch.lang = normalizeLocale(flags.lang);
    saveConfig(patch);
    ok(t("config.updated"));
    return 0;
  }
  const cfg = loadConfig();
  banner();
  log(c.bold(`  ${t("config.title")}\n`));
  info(t("config.baseUrl", { url: c.lime(cfg.baseUrl) }));
  info(t("config.default", { model: c.lime(cfg.defaultModel) }));
  info(t("config.apiKey", { masked: cfg.apiKey ? c.lime(cfg.apiKey.slice(0, 4) + "•".repeat(6)) : c.dim(t("config.apiKeyNone")) }));
  info(t("config.lang", { lang: c.lime(getLocale()) }));
  info(t("config.keysMgmt", { url: c.lime(KEYS_URL) }));
  info(t("config.file", { file: c.dim(BARYON_CONFIG) }));
  info(t("config.piModels", { file: c.dim(PI_MODELS_JSON) }));
  log("");
  return 0;
}

export function keys() {
  log(`  ${sym.info} ${t("keys.title")}`);
  log(`     ${c.lime(KEYS_URL)}`);
  log(`  ${c.dim(t("keys.sub", { prefix: KEY_PREFIX }))}`);
  log(`  ${c.dim(t("keys.after"))} ${c.lime("baryon setup")} ${c.dim(t("keys.or"))} ${c.lime("baryon config --key vc_live_…")}`);
  // best-effort open in browser
  const opener =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  try {
    spawn(opener, [KEYS_URL], {
      stdio: "ignore",
      detached: true,
      shell: process.platform === "win32",
    }).unref();
  } catch {
    /* headless / no browser — link above is enough */
  }
  return 0;
}

// Enterprise: delegate to @baryonlabs/edge's launcher (read-only data sandbox).
export function edge(args) {
  return new Promise((resolve) => {
    const child = spawn("baryon-edge", args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", () => {
      log(`  ${sym.warn} ${t("edge.notInstalled")}`);
      log(`     ${c.lime("npm i -g @baryonlabs/edge")}`);
      resolve(1);
    });
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

export function update() {
  return new Promise((resolve) => {
    // 1/2 — CLI + pi core via npm (gets the latest pi binary, e.g. 0.80.x).
    log(`  ${sym.info} ${t("update.stage1", { cmd: c.lime(`npm install -g @baryonlabs/cli ${PI_PACKAGE}`) })}\n`);
    const npm = spawn("npm", ["install", "-g", "@baryonlabs/cli", PI_PACKAGE], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    npm.on("error", () => {
      err(t("update.npmFail"));
      resolve(1);
    });

    npm.on("exit", (code) => {
      // 2/2 — pi's own packages (pi-mcp-adapter, pi-dynamic-workflows, …) are
      // managed by `pi update`, not npm. Run it so those notices clear too.
      const entry = resolvePiEntry();
      if (!entry) return resolve(code ?? 0);

      log(`\n  ${sym.info} ${t("update.stage2", { cmd: c.lime("pi update") })}\n`);
      const pu = spawn(process.execPath, [entry, "update"], { stdio: "inherit" });
      pu.on("error", () => resolve(code ?? 0));
      pu.on("exit", () => {
        log(`\n  ${sym.ok} ${t("update.done", { hint: c.dim(t("update.doneHint")) })}`);
        resolve(code ?? 0);
      });
    });
  });
}

export function installDefaults() {
  const entry = resolvePiEntry();

  if (!entry) {
    warn(t("ext.piMissing", { pkg: PI_PACKAGE }));
    return 0;
  }

  // Self-heal machines broken by a previously-shipped conflicting extension
  // (e.g. pi-search ↔ pi-web-fetch both registering `web_fetch`, which hard-fails
  // every run). Remove them from pi's registry + disk before (re)installing.
  const pruned = prunePiPackages(DEPRECATED_EXTENSIONS);
  if (pruned.length) warn(t("ext.pruned", { names: pruned.join(", ") }));

  log(`  ${sym.info} ${t("ext.installing", { count: DEFAULT_EXTENSIONS.length })}`);
  let okc = 0;

  for (const e of DEFAULT_EXTENSIONS) {
    // git clone is flaky under GitHub rate-limiting / transient network — retry
    // a few times so a single class doesn't end up with "0/N" extensions.
    let status = 1;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const r = spawnSync(process.execPath, [entry, "install", e.src], { encoding: "utf8" });
      status = r.status;
      if (status === 0) break;
      // Cross-platform synchronous backoff (no `sleep` binary — Windows lacks it).
      if (attempt < 3) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
    }

    if (status === 0) {
      ok(t("ext.itemOk", { name: e.name, note: e.note }));
      okc++;
    } else {
      warn(t("ext.itemFail", { name: e.name }));
    }
  }

  log(`  ${sym.ok} ${t("ext.summary", { ok: okc, total: DEFAULT_EXTENSIONS.length })}`);
  return okc;
}

// Install the default Agent Skills pack (pdf/pptx/xlsx) into ~/.pi/agent/skills/,
// which pi auto-discovers. All three are subfolders of one repo, so we shallow-
// clone once and copy each. Idempotent (skips skills already present) and safe to
// re-run. Returns the count installed/present.
export function installSkills() {
  const installed = (s) => fs.existsSync(path.join(PI_SKILLS_DIR, s.name, "SKILL.md"));
  const missing = DEFAULT_SKILLS.filter((s) => !installed(s));
  let okc = DEFAULT_SKILLS.length - missing.length;

  if (missing.length === 0) {
    log(`  ${sym.ok} ${t("skills.alreadyAll", { total: DEFAULT_SKILLS.length })}`);
    return DEFAULT_SKILLS.length;
  }

  log(`  ${sym.info} ${t("skills.installing", { count: missing.length })}`);
  fs.mkdirSync(PI_SKILLS_DIR, { recursive: true });

  // Bundled skills ship inside this package under ../skills/<name>/.
  const bundledRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "skills");

  const copySkill = (srcDir, s) => {
    const dst = path.join(PI_SKILLS_DIR, s.name);
    if (!fs.existsSync(path.join(srcDir, "SKILL.md"))) {
      warn(t("skills.noSkillMd", { name: s.name, dir: srcDir }));
      return false;
    }
    fs.rmSync(dst, { recursive: true, force: true });
    fs.cpSync(srcDir, dst, { recursive: true });
    ok(t("skills.itemOk", { name: s.name, note: s.note }));
    return true;
  };

  // 1) Bundled skills — straight copy, no network.
  for (const s of missing.filter((s) => s.source === "bundled")) {
    try {
      if (copySkill(path.join(bundledRoot, s.name), s)) okc++;
    } catch (e) {
      warn(t("skills.itemFail", { name: s.name, error: e.message }));
    }
  }

  // 2) Repo skills — shallow-clone the source repo once, copy each subdir.
  const repoSkills = missing.filter((s) => s.source === "repo");
  if (repoSkills.length > 0) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "baryon-skills-"));
    try {
      let cloned = false;
      for (let attempt = 1; attempt <= 3 && !cloned; attempt++) {
        const r = spawnSync(
          "git",
          ["clone", "--depth", "1", "--filter=blob:none", SKILLS_REPO, tmp],
          { encoding: "utf8" },
        );
        cloned = r.status === 0;
        if (!cloned && attempt < 3)
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
      }

      if (!cloned) {
        warn(t("skills.cloneFail"));
      } else {
        for (const s of repoSkills) {
          try {
            if (copySkill(path.join(tmp, ...s.subdir.split("/")), s)) okc++;
          } catch (e) {
            warn(t("skills.itemFail", { name: s.name, error: e.message }));
          }
        }
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  log(`  ${sym.ok} ${t("skills.summary", { ok: okc, total: DEFAULT_SKILLS.length, dir: PI_SKILLS_DIR })}`);
  return okc;
}

// Install the agent-browser CLI (web/ERP automation) globally so the
// agent-browser skill works out of the box. Best-effort: a failure (offline,
// no npm) is a warning, not a setup failure. Heavy step (Rust binary + Chrome
// for Testing download), so it's opt-out via --no-browser.
export function installBrowser() {
  // Already present?
  const probe = spawnSync("agent-browser", ["--version"], { encoding: "utf8" });
  if (probe.status === 0) {
    ok(t("browser.installed", { version: (probe.stdout || "").trim() || "ok" }));
    return true;
  }

  log(`  ${sym.info} ${t("browser.installing")}`);

  let ok1 = false;
  for (let attempt = 1; attempt <= 2 && !ok1; attempt++) {
    const r = spawnSync("npm", ["install", "-g", "agent-browser"], { encoding: "utf8", stdio: "ignore" });
    ok1 = r.status === 0;
    if (!ok1 && attempt < 2) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
  }

  if (!ok1) {
    warn(t("browser.installFail"));
    return false;
  }

  // Download the browser engine (Chrome for Testing). Best-effort.
  const inst = spawnSync("agent-browser", ["install"], { encoding: "utf8", stdio: "ignore" });
  if (inst.status === 0) ok(t("browser.ready"));
  else warn(t("browser.engineMissing"));

  return true;
}

export function extensions(args) {
  const sub = args[0];

  if (sub === "list" || sub === "ls") {
    return runPi(["list"], loadConfig(), { injectTargeting: false })
  }

  banner();
  log(c.bold(`  ${t("ext.bannerTitle")}\n`));
  installDefaults()
  log(`\n  ${sym.info} ${t("ext.footer", { list: c.lime("baryon extensions list"), remove: c.lime("baryon -- remove <src>") })}\n`)
  return 0;
}

// `baryon skills` — install/sync the default Agent Skills pack; `list` shows it.
export function skills(args) {
  const sub = args[0];
  banner();

  if (sub === "list" || sub === "ls") {
    log(c.bold(`  ${t("skills.bannerListTitle")}\n`));
    for (const s of DEFAULT_SKILLS) {
      const here = fs.existsSync(path.join(PI_SKILLS_DIR, s.name, "SKILL.md"));
      log(`  ${here ? sym.ok : sym.info} ${c.lime(s.name)} — ${s.note} ${here ? "" : c.dim(t("skills.notInstalled"))}`);
    }
    log(`\n  ${sym.info} ${t("skills.listFooter", { cmd: c.lime("baryon skills"), dir: c.dim(PI_SKILLS_DIR) })}\n`);
    return 0;
  }

  log(c.bold(`  ${t("skills.bannerInstallTitle")}\n`));
  installSkills();
  log(`\n  ${sym.info} ${t("skills.installFooter", { call: c.lime("/skill pdf"), list: c.lime("baryon skills list") })}\n`);
  return 0;
}

export function help() {
  banner();
  log(`${c.bold("USAGE")}
  ${c.lime("baryon")} ${c.dim("[options] [@files...] [messages...]")}     ${t("help.usageDesc")}

${c.bold("COMMANDS")}
  ${c.lime("baryon setup")}            ${t("help.cmd.setup")}
  ${c.lime("baryon keys")}             ${t("help.cmd.keys")} ${c.dim(t("help.cmd.keysNote"))}
  ${c.lime("baryon config")}           ${t("help.cmd.config")} ${c.dim(t("help.cmd.configNote"))}
  ${c.lime("baryon models")}           ${t("help.cmd.models")}
  ${c.lime("baryon extensions")}       ${t("help.cmd.extensions")} ${c.dim(t("help.cmd.extensionsNote"))}
  ${c.lime("baryon skills")}           ${t("help.cmd.skills")} ${c.dim(t("help.cmd.skillsNote"))}
  ${c.lime("baryon doctor")}           ${t("help.cmd.doctor")}
  ${c.lime("baryon update")}           ${t("help.cmd.update")}
  ${c.lime("baryon help")}             ${t("help.cmd.help")}

${c.bold("EXAMPLES")}
  ${c.dim("$")} baryon                              ${c.dim(t("help.ex.interactive"))}
  ${c.dim("$")} baryon -p "${t("help.ex.oneShotMsg")}"   ${c.dim(t("help.ex.oneShot"))}
  ${c.dim("$")} baryon --provider openai            ${c.dim(t("help.ex.switch"))}
  ${c.dim("$")} baryon --list-models                ${c.dim(t("help.ex.passthrough"))}

${c.dim(t("help.lang", { env: "BARYON_LANG", cmd: "baryon config --lang" }))}
${c.dim(t("help.passthrough"))}
${c.dim(t("help.docs", { homepage: HOMEPAGE, email: SUPPORT_EMAIL }))}
`);
  return 0;
}

/** Quiet first-run hint shown by postinstall (never fails the install). */
export function welcome() {
  if (!process.stdout.isTTY) return 0;
  log(`\n${c.lime("✔")} ${t("welcome.installed", { pkg: c.bold("@baryonlabs/cli") })}`);
  log(`  ${c.dim(t("welcome.nextLabel"))} ${c.lime("baryon setup")} ${c.dim("→")} ${c.lime("baryon")}`);
  log(`  ${c.dim(HOMEPAGE)}\n`);
  return 0;
}
