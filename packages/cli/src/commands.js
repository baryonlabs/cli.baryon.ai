// Built-in baryon subcommands. Anything not matched here is passed to pi.
import { spawn } from "node:child_process";
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
  DEPRECATED_EXTENSIONS,
  HOMEPAGE,
  KEYS_URL,
  KEY_PREFIX,
  PI_PACKAGE,
  PROVIDER,
  SUPPORT_EMAIL,
} from "./constants.js";
import { runPi, resolvePiEntry } from "./pi.js";
import { banner, c, info, log, ok, err, warn, prompt, promptHidden, sym } from "./ui.js";

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
  log(c.bold("  baryon.ai 연결 설정\n"));

  const existing = loadConfig();
  const baseUrl = flags["base-url"] || existing.baseUrl || DEFAULT_BASE_URL;

  let apiKey = flags.key || flags["api-key"] || process.env.BARYON_API_KEY || "";
  if (!apiKey) {
    // Tell the user where keys come from before asking for one.
    log(`  ${sym.info} 키 발급·관리: ${c.lime(KEYS_URL)}`);
    log(`  ${c.dim(`   (vibecamp.us 대시보드에서 발급/회수 · 형식 ${KEY_PREFIX}…)`)}\n`);
    apiKey = await promptHidden(`  ${sym.info} baryon.ai API key: `);
  }
  if (!apiKey) {
    warn("API 키 없이 저장합니다. 나중에 `baryon setup --key <KEY>` 로 추가하세요.");
  } else if (!apiKey.startsWith(KEY_PREFIX)) {
    warn(`키 형식이 ${KEY_PREFIX}… 가 아닙니다. 로컬/상용 키라면 무시하세요.`);
  }

  saveConfig({ apiKey, baseUrl });
  ok(`config 저장 → ${c.dim(BARYON_CONFIG)}`);

  // Try live model discovery; fall back to defaults offline.
  let models = null;
  if (apiKey) {
    info("모델 목록을 조회하는 중…");
    models = await discoverModels(baseUrl, apiKey);
  }
  if (models) {
    ok(`${models.length}개 모델 발견 (${c.lime(models.map((m) => m.id).slice(0, 4).join(", "))}${models.length > 4 ? "…" : ""})`);
  } else {
    models = DEFAULT_MODELS;
    warn(`모델 자동 조회 실패 — 기본 모델 ${models.length}개로 구성 (오프라인/폐쇄망 정상)`);
  }

  saveConfig({ defaultModel: models[0].id });
  const file = syncPiModels({ baseUrl, models });
  ok(`pi 프로바이더 ${c.lime(PROVIDER)} 구성 → ${c.dim(file)}`);

  if (flags["no-extensions"]) {
    info("기본 확장 설치 건너뜀 (--no-extensions)");
  } else {
    installDefaults();
  }

  log(`\n  ${sym.ok} 준비 완료. ${c.lime("baryon")} 으로 시작하세요.\n`);
  return 0;
}

export async function doctor() {
  banner();
  log(c.bold("  진단 (baryon doctor)\n"));
  let problems = 0;

  // node
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 22) ok(`Node.js ${process.version}`);
  else {
    err(`Node.js ${process.version} — 22 이상 필요`);
    problems++;
  }

  // pi installed?
  const entry = resolvePiEntry();
  if (entry) ok(`${PI_PACKAGE} 설치됨`);
  else {
    err(`${PI_PACKAGE} 미설치 — npm install -g @baryonlabs/cli`);
    problems++;
  }

  // config?
  if (hasConfig()) ok(`config 존재 → ${c.dim(BARYON_CONFIG)}`);
  else {
    warn("config 없음 — `baryon setup` 실행 필요");
    problems++;
  }

  const cfg = loadConfig();
  if (cfg.apiKey) ok(`API 키 설정됨 (${cfg.apiKey.slice(0, 4)}${"•".repeat(6)})`);
  else warn("API 키 없음");

  // CLI version currency (best-effort; silent offline)
  const ver = await checkLatest();
  if (ver?.outdated) {
    warn(`CLI 구버전 ${ver.current} — 최신 ${ver.latest}. baryon.ai 사용에 업데이트 필요 (\`baryon update\`)`);
    problems++;
  } else if (ver) {
    ok(`CLI 최신 버전 (${ver.current})`);
  }

  // pi provider registered?
  if (piProviderConfigured()) ok(`pi 프로바이더 ${c.lime(PROVIDER)} 등록됨 → ${c.dim(PI_MODELS_JSON)}`);
  else {
    warn("pi 프로바이더 미등록 — `baryon setup` 실행");
    problems++;
  }

  // connectivity
  info(`연결 확인 중 → ${c.dim(cfg.baseUrl)}`);
  const r = await ping(cfg.baseUrl, cfg.apiKey);
  if (r.ok) ok(`baryon.ai 연결 정상 (HTTP ${r.status})`);
  else if (r.status) warn(`엔드포인트 응답 HTTP ${r.status} — 키/권한 확인`);
  else warn(`연결 불가 (${r.error}) — 오프라인이면 로컬 LLM 사용 가능`);

  log(
    problems === 0
      ? `\n  ${sym.ok} ${c.teal("모든 점검 통과")}\n`
      : `\n  ${sym.warn} ${c.yellow(`${problems}건 확인 필요`)}\n`,
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
  if (flags.key || flags["api-key"] || flags["base-url"] || flags.model) {
    const patch = {};
    if (flags.key || flags["api-key"]) patch.apiKey = flags.key || flags["api-key"];
    if (flags["base-url"]) patch.baseUrl = flags["base-url"];
    if (flags.model) patch.defaultModel = flags.model;
    saveConfig(patch);
    ok("config 업데이트됨");
    return 0;
  }
  const cfg = loadConfig();
  banner();
  log(c.bold("  현재 설정\n"));
  info(`base URL    ${c.lime(cfg.baseUrl)}`);
  info(`default     ${c.lime(cfg.defaultModel)}`);
  info(`API key     ${cfg.apiKey ? cfg.apiKey.slice(0, 4) + "•".repeat(6) : c.dim("(없음)")}`);
  info(`키 관리      ${c.lime(KEYS_URL)}`);
  info(`config 파일  ${c.dim(BARYON_CONFIG)}`);
  info(`pi models   ${c.dim(PI_MODELS_JSON)}`);
  log("");
  return 0;
}

export function keys() {
  log(`  ${sym.info} 키 발급·관리 (vibecamp.us 대시보드):`);
  log(`     ${c.lime(KEYS_URL)}`);
  log(`  ${c.dim(`   발급/회수/쿼터는 vibecamp.us 가 관리 · 형식 ${KEY_PREFIX}…`)}`);
  log(`  ${c.dim("   발급 후:")} ${c.lime("baryon setup")} ${c.dim("또는")} ${c.lime("baryon config --key vc_live_…")}`);
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

export function update() {
  return new Promise((resolve) => {
    log(`  ${sym.info} 업데이트: ${c.lime(`npm install -g @baryonlabs/cli ${PI_PACKAGE}`)}\n`);
    const child = spawn(
      "npm",
      ["install", "-g", "@baryonlabs/cli", PI_PACKAGE],
      { stdio: "inherit", shell: process.platform === "win32" },
    );
    child.on("exit", (code) => resolve(code ?? 0));
    child.on("error", () => {
      err("npm 실행 실패 — 수동으로 위 명령을 실행하세요.");
      resolve(1);
    });
  });
}

export function installDefaults() {
  const entry = resolvePiEntry();

  if (!entry) {
    warn(`${PI_PACKAGE} 미설치 — 확장 건너뜀`);
    return 0;
  }

  // Self-heal machines broken by a previously-shipped conflicting extension
  // (e.g. pi-search ↔ pi-web-fetch both registering `web_fetch`, which hard-fails
  // every run). Remove them from pi's registry + disk before (re)installing.
  const pruned = prunePiPackages(DEPRECATED_EXTENSIONS);
  if (pruned.length) warn(`충돌 확장 제거: ${pruned.join(", ")} (자가 치유)`);

  log(`  ${sym.info} 기본 확장 설치 중 (${DEFAULT_EXTENSIONS.length}종 · git clone, 잠시 걸립니다)…`);
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
      ok(`${e.name} — ${e.note}`);
      okc++;
    } else {
      warn(`${e.name} 설치 실패(네트워크/git 확인) — 건너뜀`);
    }
  }

  log(`  ${sym.ok} 확장 ${okc}/${DEFAULT_EXTENSIONS.length} 설치`);
  return okc;
}

export function extensions(args) {
  const sub = args[0];

  if (sub === "list" || sub === "ls") {
    return runPi(["list"], loadConfig(), { injectTargeting: false })
  }

  banner();
  log(c.bold("  Baryon 기본 확장\n"));
  installDefaults()
  log(`\n  ${sym.info} 목록: ${c.lime("baryon extensions list")} · 제거: ${c.lime("baryon -- remove <src>")}\n`)
  return 0;
}

export function help() {
  banner();
  log(`${c.bold("USAGE")}
  ${c.lime("baryon")} ${c.dim("[options] [@files...] [messages...]")}     코딩 에이전트 시작 (baryon.ai 기본)

${c.bold("COMMANDS")}
  ${c.lime("baryon setup")}            baryon.ai API 키 등록 + pi 프로바이더 구성
  ${c.lime("baryon keys")}             키 발급·관리 대시보드 열기 ${c.dim("(vibecamp.us)")}
  ${c.lime("baryon config")}           현재 설정 보기 ${c.dim("(--key/--base-url/--model 로 변경)")}
  ${c.lime("baryon models")}           사용 가능한 모델 목록
  ${c.lime("baryon extensions")}       기본 확장 설치(서브에이전트·캔버스·셸·웹) ${c.dim("· list 로 목록")}
  ${c.lime("baryon doctor")}           설치·연결 진단
  ${c.lime("baryon update")}           CLI + pi 에이전트 업데이트
  ${c.lime("baryon help")}             이 도움말

${c.bold("EXAMPLES")}
  ${c.dim("$")} baryon                              ${c.dim("# 대화형 시작")}
  ${c.dim("$")} baryon -p "CSV 분석해 차트 만들어줘"   ${c.dim("# 단발 실행")}
  ${c.dim("$")} baryon --provider openai            ${c.dim("# 다른 모델로 전환·비교")}
  ${c.dim("$")} baryon --list-models                ${c.dim("# pi 패스스루")}

${c.dim(`그 외 모든 옵션은 pi 에이전트로 그대로 전달됩니다.`)}
${c.dim(`문서: ${HOMEPAGE} · 문의: ${SUPPORT_EMAIL}`)}
`);
  return 0;
}

/** Quiet first-run hint shown by postinstall (never fails the install). */
export function welcome() {
  if (!process.stdout.isTTY) return 0;
  log(`\n${c.lime("✔")} ${c.bold("@baryonlabs/cli")} 설치 완료`);
  log(`  ${c.dim("다음 단계:")} ${c.lime("baryon setup")} ${c.dim("→")} ${c.lime("baryon")}`);
  log(`  ${c.dim(HOMEPAGE)}\n`);
  return 0;
}
