// Tiny zero-dependency ko/en i18n layer for OUR user-facing CLI messages.
//
//   import { t } from "./i18n.js";
//   t("setup.saved", { file });   // → localized, interpolated string
//
// Locale resolution (first hit wins): BARYON_LANG env → `lang` in
// ~/.baryon/config.json → "ko". Korean is the default & the fallback for any
// missing key/locale. Resolution NEVER throws.
import fs from "node:fs";
import { BARYON_CONFIG } from "./constants.js";

/** Normalize "ko", "ko-KR", "en", "en-US", "EN" … → "ko" | "en". Unknown → "ko". */
export function normalizeLocale(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v.startsWith("en")) return "en";
  if (v.startsWith("ko")) return "ko";
  return "ko";
}

/** Read `lang` from ~/.baryon/config.json defensively (never throws). */
function langFromConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(BARYON_CONFIG, "utf8"));
    return cfg && typeof cfg.lang === "string" ? cfg.lang : "";
  } catch {
    return "";
  }
}

let override = null; // explicit setLocale() wins over env/config when set.

/** Resolve the active locale: explicit override → env → config → "ko". */
export function getLocale() {
  if (override) return override;
  if (process.env.BARYON_LANG) return normalizeLocale(process.env.BARYON_LANG);
  const fromCfg = langFromConfig();
  if (fromCfg) return normalizeLocale(fromCfg);
  return "ko";
}

/** Force a locale for the current process (mainly for tests / programmatic use). */
export function setLocale(value) {
  override = value ? normalizeLocale(value) : null;
  return override;
}

const MESSAGES = {
  ko: {
    // ── setup ────────────────────────────────────────────────────────────
    "setup.title": "baryon.ai 연결 설정",
    "setup.keyHint": "키 발급·관리: {url}",
    "setup.keyHintSub": "   (vibecamp.us 대시보드에서 발급/회수 · 형식 {prefix}…)",
    "setup.keyPrompt": "baryon.ai API key: ",
    "setup.noKey": "API 키 없이 저장합니다. 나중에 `baryon setup --key <KEY>` 로 추가하세요.",
    "setup.badKeyFormat": "키 형식이 {prefix}… 가 아닙니다. 로컬/상용 키라면 무시하세요.",
    "setup.configSaved": "config 저장 → {file}",
    "setup.discovering": "모델 목록을 조회하는 중…",
    "setup.modelsFound": "{count}개 모델 발견 ({list}{more})",
    "setup.modelsFailed": "모델 자동 조회 실패 — 기본 모델 {count}개로 구성 (오프라인/폐쇄망 정상)",
    "setup.providerConfigured": "pi 프로바이더 {provider} 구성 → {file}",
    "setup.skipExtensions": "기본 확장 설치 건너뜀 (--no-extensions)",
    "setup.skipSkills": "기본 스킬 설치 건너뜀 (--no-skills)",
    "setup.skipBrowser": "agent-browser 설치 건너뜀 (--no-browser)",
    "setup.done": "준비 완료. {cmd} 으로 시작하세요.",

    // ── doctor ───────────────────────────────────────────────────────────
    "doctor.title": "진단 (baryon doctor)",
    "doctor.node": "Node.js {version}",
    "doctor.nodeOld": "Node.js {version} — 22 이상 필요",
    "doctor.piInstalled": "{pkg} 설치됨",
    "doctor.piMissing": "{pkg} 미설치 — npm install -g @baryonlabs/cli",
    "doctor.configFound": "config 존재 → {file}",
    "doctor.configMissing": "config 없음 — `baryon setup` 실행 필요",
    "doctor.apiKeySet": "API 키 설정됨 ({masked})",
    "doctor.apiKeyMissing": "API 키 없음",
    "doctor.cliOutdated": "CLI 구버전 {current} — 최신 {latest}. baryon.ai 사용에 업데이트 필요 (`baryon update`)",
    "doctor.cliCurrent": "CLI 최신 버전 ({current})",
    "doctor.providerRegistered": "pi 프로바이더 {provider} 등록됨 → {file}",
    "doctor.providerMissing": "pi 프로바이더 미등록 — `baryon setup` 실행",
    "doctor.skillsAll": "기본 스킬 {have}/{total} 설치됨 (pdf·pptx·xlsx·agent-browser)",
    "doctor.skillsSome": "기본 스킬 {have}/{total} — `baryon skills` 로 설치",
    "doctor.browserInstalled": "agent-browser 설치됨 ({version})",
    "doctor.browserMissing": "agent-browser 미설치 — `baryon setup`(자동) 또는 `npm i -g agent-browser`",
    "doctor.checkingConn": "연결 확인 중 → {url}",
    "doctor.connOk": "baryon.ai 연결 정상 (HTTP {status})",
    "doctor.connStatus": "엔드포인트 응답 HTTP {status} — 키/권한 확인",
    "doctor.connFail": "연결 불가 ({error}) — 오프라인이면 로컬 LLM 사용 가능",
    "doctor.allPass": "모든 점검 통과",
    "doctor.problems": "{count}건 확인 필요",

    // ── config ───────────────────────────────────────────────────────────
    "config.updated": "config 업데이트됨",
    "config.title": "현재 설정",
    "config.baseUrl": "base URL    {url}",
    "config.default": "default     {model}",
    "config.apiKey": "API key     {masked}",
    "config.apiKeyNone": "(없음)",
    "config.lang": "language    {lang}",
    "config.keysMgmt": "키 관리      {url}",
    "config.file": "config 파일  {file}",
    "config.piModels": "pi models   {file}",

    // ── keys ─────────────────────────────────────────────────────────────
    "keys.title": "키 발급·관리 (vibecamp.us 대시보드):",
    "keys.sub": "   발급/회수/쿼터는 vibecamp.us 가 관리 · 형식 {prefix}…",
    "keys.after": "   발급 후:",
    "keys.or": "또는",

    // ── update ───────────────────────────────────────────────────────────
    "update.stage1": "1/2 CLI·코어 업데이트: {cmd}",
    "update.npmFail": "npm 실행 실패 — 수동으로 위 명령을 실행하세요.",
    "update.stage2": "2/2 pi 패키지 업데이트: {cmd}",
    "update.done": "업데이트 완료. {hint}",
    "update.doneHint": "baryon doctor 로 점검 가능",

    // ── extensions install ───────────────────────────────────────────────
    "ext.piMissing": "{pkg} 미설치 — 확장 건너뜀",
    "ext.pruned": "충돌 확장 제거: {names} (자가 치유)",
    "ext.installing": "기본 확장 설치 중 ({count}종 · git clone, 잠시 걸립니다)…",
    "ext.itemOk": "{name} — {note}",
    "ext.itemFail": "{name} 설치 실패(네트워크/git 확인) — 건너뜀",
    "ext.summary": "확장 {ok}/{total} 설치",
    "ext.bannerTitle": "Baryon 기본 확장",
    "ext.footer": "목록: {list} · 제거: {remove}",

    // ── skills install ───────────────────────────────────────────────────
    "skills.alreadyAll": "기본 스킬 {total}/{total} (이미 설치됨)",
    "skills.installing": "기본 스킬 설치 중 ({count}종)…",
    "skills.noSkillMd": "{name} — SKILL.md 없음({dir}), 건너뜀",
    "skills.itemOk": "skill: {name} — {note}",
    "skills.itemFail": "{name} 스킬 설치 실패 — 건너뜀 ({error})",
    "skills.cloneFail": "스킬 저장소 clone 실패(네트워크/git 확인) — 일부 스킬 건너뜀",
    "skills.summary": "기본 스킬 {ok}/{total} 설치 → {dir}",
    "skills.bannerListTitle": "Baryon 기본 스킬 팩",
    "skills.notInstalled": "(미설치)",
    "skills.listFooter": "설치/동기화: {cmd} · 위치: {dir}",
    "skills.bannerInstallTitle": "Baryon 기본 스킬 설치",
    "skills.installFooter": "사용: pi 에이전트에서 {call} 처럼 호출 · 목록: {list}",

    // ── browser install ──────────────────────────────────────────────────
    "browser.installed": "agent-browser 설치됨 ({version})",
    "browser.installing": "agent-browser 설치 중 (웹/ERP 자동화 · 최초 1회, 브라우저 다운로드 포함)…",
    "browser.installFail": "agent-browser 설치 실패(네트워크/npm 확인) — 건너뜀. 나중에 `npm i -g agent-browser && agent-browser install`",
    "browser.ready": "agent-browser — 웹/ERP 브라우저 자동화 준비됨",
    "browser.engineMissing": "agent-browser 바이너리는 설치됨 · 브라우저 다운로드 미완 — 최초 사용 시 `agent-browser install`",

    // ── help ─────────────────────────────────────────────────────────────
    "help.usageDesc": "코딩 에이전트 시작 (baryon.ai 기본)",
    "help.cmd.setup": "baryon.ai API 키 등록 + pi 프로바이더 구성",
    "help.cmd.keys": "키 발급·관리 대시보드 열기",
    "help.cmd.keysNote": "(vibecamp.us)",
    "help.cmd.config": "현재 설정 보기",
    "help.cmd.configNote": "(--key/--base-url/--model/--lang 로 변경)",
    "help.cmd.models": "사용 가능한 모델 목록",
    "help.cmd.extensions": "기본 확장 설치(서브에이전트·캔버스·셸·웹)",
    "help.cmd.extensionsNote": "· list 로 목록",
    "help.cmd.skills": "기본 스킬 설치(pdf·pptx·xlsx)",
    "help.cmd.skillsNote": "· list 로 목록",
    "help.cmd.doctor": "설치·연결 진단",
    "help.cmd.update": "CLI + pi 에이전트 업데이트",
    "help.cmd.help": "이 도움말",
    "help.ex.interactive": "# 대화형 시작",
    "help.ex.oneShot": "# 단발 실행",
    "help.ex.oneShotMsg": "CSV 분석해 차트 만들어줘",
    "help.ex.switch": "# 다른 모델로 전환·비교",
    "help.ex.passthrough": "# pi 패스스루",
    "help.lang": "언어 설정: 환경변수 {env} 또는 {cmd} (ko·en)",
    "help.passthrough": "그 외 모든 옵션은 pi 에이전트로 그대로 전달됩니다.",
    "help.docs": "문서: {homepage} · 문의: {email}",

    // ── welcome (postinstall) ────────────────────────────────────────────
    "welcome.installed": "{pkg} 설치 완료",
    "welcome.nextLabel": "다음 단계:",

    // ── runtime / bin ────────────────────────────────────────────────────
    "bin.outdated": "업데이트 필요: @baryonlabs/cli {current} → {latest}",
    "bin.outdatedSub": "baryon.ai 사용에 최신 버전이 필요합니다.",
    "bin.outdatedRun": "를 실행하세요.",
    "pi.notInstalled": "{pkg} is not installed. Run: npm install -g @baryonlabs/cli",
    "bin.piVersion": "pi {version}",
    "bin.unconfiguredTTY": "아직 설정되지 않았습니다.",
    "bin.unconfiguredTTYRun": "을 먼저 실행합니다.",
    "bin.unconfigured": "설정이 없습니다.",
    "bin.unconfiguredRun": "을 먼저 실행하세요.",
    "bin.prunedConflicts": "충돌 확장 정리됨: {names}",
    "bin.room": "🏫 {project} · 좌석 {seat}",
    "bin.roomInactive": "🚫 {project} (비활성) · 좌석 {seat}",
    "edge.notInstalled": "Baryon Edge(엔터프라이즈) 미설치 — 읽기전용 데이터 샌드박스:",
  },

  en: {
    // ── setup ────────────────────────────────────────────────────────────
    "setup.title": "baryon.ai connection setup",
    "setup.keyHint": "Issue / manage keys: {url}",
    "setup.keyHintSub": "   (issue/revoke at the vibecamp.us dashboard · format {prefix}…)",
    "setup.keyPrompt": "baryon.ai API key: ",
    "setup.noKey": "Saving without an API key. Add one later with `baryon setup --key <KEY>`.",
    "setup.badKeyFormat": "Key does not match {prefix}… — ignore this if it's a local/commercial key.",
    "setup.configSaved": "config saved → {file}",
    "setup.discovering": "Fetching model list…",
    "setup.modelsFound": "Found {count} models ({list}{more})",
    "setup.modelsFailed": "Model auto-discovery failed — using {count} default models (normal when offline/air-gapped)",
    "setup.providerConfigured": "pi provider {provider} configured → {file}",
    "setup.skipExtensions": "Skipping default extensions (--no-extensions)",
    "setup.skipSkills": "Skipping default skills (--no-skills)",
    "setup.skipBrowser": "Skipping agent-browser (--no-browser)",
    "setup.done": "All set. Start with {cmd}.",

    // ── doctor ───────────────────────────────────────────────────────────
    "doctor.title": "Diagnostics (baryon doctor)",
    "doctor.node": "Node.js {version}",
    "doctor.nodeOld": "Node.js {version} — 22 or newer required",
    "doctor.piInstalled": "{pkg} installed",
    "doctor.piMissing": "{pkg} not installed — npm install -g @baryonlabs/cli",
    "doctor.configFound": "config found → {file}",
    "doctor.configMissing": "config missing — run `baryon setup`",
    "doctor.apiKeySet": "API key set ({masked})",
    "doctor.apiKeyMissing": "No API key",
    "doctor.cliOutdated": "CLI outdated {current} — latest {latest}. Update required to use baryon.ai (`baryon update`)",
    "doctor.cliCurrent": "CLI up to date ({current})",
    "doctor.providerRegistered": "pi provider {provider} registered → {file}",
    "doctor.providerMissing": "pi provider not registered — run `baryon setup`",
    "doctor.skillsAll": "Default skills {have}/{total} installed (pdf·pptx·xlsx·agent-browser)",
    "doctor.skillsSome": "Default skills {have}/{total} — install with `baryon skills`",
    "doctor.browserInstalled": "agent-browser installed ({version})",
    "doctor.browserMissing": "agent-browser not installed — `baryon setup` (auto) or `npm i -g agent-browser`",
    "doctor.checkingConn": "Checking connection → {url}",
    "doctor.connOk": "baryon.ai reachable (HTTP {status})",
    "doctor.connStatus": "Endpoint returned HTTP {status} — check key/permissions",
    "doctor.connFail": "Cannot connect ({error}) — a local LLM works if you're offline",
    "doctor.allPass": "All checks passed",
    "doctor.problems": "{count} item(s) need attention",

    // ── config ───────────────────────────────────────────────────────────
    "config.updated": "config updated",
    "config.title": "Current settings",
    "config.baseUrl": "base URL    {url}",
    "config.default": "default     {model}",
    "config.apiKey": "API key     {masked}",
    "config.apiKeyNone": "(none)",
    "config.lang": "language    {lang}",
    "config.keysMgmt": "key mgmt    {url}",
    "config.file": "config file {file}",
    "config.piModels": "pi models   {file}",

    // ── keys ─────────────────────────────────────────────────────────────
    "keys.title": "Issue / manage keys (vibecamp.us dashboard):",
    "keys.sub": "   issuance/revocation/quota managed by vibecamp.us · format {prefix}…",
    "keys.after": "   after issuing:",
    "keys.or": "or",

    // ── update ───────────────────────────────────────────────────────────
    "update.stage1": "1/2 update CLI & core: {cmd}",
    "update.npmFail": "npm failed — run the command above manually.",
    "update.stage2": "2/2 update pi packages: {cmd}",
    "update.done": "Update complete. {hint}",
    "update.doneHint": "run baryon doctor to verify",

    // ── extensions install ───────────────────────────────────────────────
    "ext.piMissing": "{pkg} not installed — skipping extensions",
    "ext.pruned": "Removed conflicting extensions: {names} (self-heal)",
    "ext.installing": "Installing default extensions ({count} · git clone, may take a moment)…",
    "ext.itemOk": "{name} — {note}",
    "ext.itemFail": "{name} install failed (check network/git) — skipped",
    "ext.summary": "Extensions {ok}/{total} installed",
    "ext.bannerTitle": "Baryon default extensions",
    "ext.footer": "list: {list} · remove: {remove}",

    // ── skills install ───────────────────────────────────────────────────
    "skills.alreadyAll": "Default skills {total}/{total} (already installed)",
    "skills.installing": "Installing default skills ({count})…",
    "skills.noSkillMd": "{name} — no SKILL.md ({dir}), skipped",
    "skills.itemOk": "skill: {name} — {note}",
    "skills.itemFail": "{name} skill install failed — skipped ({error})",
    "skills.cloneFail": "Skill repo clone failed (check network/git) — some skills skipped",
    "skills.summary": "Default skills {ok}/{total} installed → {dir}",
    "skills.bannerListTitle": "Baryon default skills pack",
    "skills.notInstalled": "(not installed)",
    "skills.listFooter": "install/sync: {cmd} · location: {dir}",
    "skills.bannerInstallTitle": "Baryon default skills install",
    "skills.installFooter": "use: invoke like {call} in the pi agent · list: {list}",

    // ── browser install ──────────────────────────────────────────────────
    "browser.installed": "agent-browser installed ({version})",
    "browser.installing": "Installing agent-browser (web/ERP automation · first run, includes browser download)…",
    "browser.installFail": "agent-browser install failed (check network/npm) — skipped. Later: `npm i -g agent-browser && agent-browser install`",
    "browser.ready": "agent-browser — web/ERP browser automation ready",
    "browser.engineMissing": "agent-browser binary installed · browser download incomplete — on first use run `agent-browser install`",

    // ── help ─────────────────────────────────────────────────────────────
    "help.usageDesc": "Start the coding agent (baryon.ai by default)",
    "help.cmd.setup": "Register baryon.ai API key + configure pi provider",
    "help.cmd.keys": "Open the key issuance/management dashboard",
    "help.cmd.keysNote": "(vibecamp.us)",
    "help.cmd.config": "Show current settings",
    "help.cmd.configNote": "(change with --key/--base-url/--model/--lang)",
    "help.cmd.models": "List available models",
    "help.cmd.extensions": "Install default extensions (sub-agents·canvas·shell·web)",
    "help.cmd.extensionsNote": "· list to view",
    "help.cmd.skills": "Install default skills (pdf·pptx·xlsx)",
    "help.cmd.skillsNote": "· list to view",
    "help.cmd.doctor": "Diagnose install & connectivity",
    "help.cmd.update": "Update CLI + pi agent",
    "help.cmd.help": "This help",
    "help.ex.interactive": "# interactive start",
    "help.ex.oneShot": "# one-shot run",
    "help.ex.oneShotMsg": "analyze the CSV and make a chart",
    "help.ex.switch": "# switch/compare other models",
    "help.ex.passthrough": "# pi passthrough",
    "help.lang": "Language: env var {env} or {cmd} (ko·en)",
    "help.passthrough": "All other options are passed straight through to the pi agent.",
    "help.docs": "Docs: {homepage} · Support: {email}",

    // ── welcome (postinstall) ────────────────────────────────────────────
    "welcome.installed": "{pkg} installed",
    "welcome.nextLabel": "Next:",

    // ── runtime / bin ────────────────────────────────────────────────────
    "bin.outdated": "Update required: @baryonlabs/cli {current} → {latest}",
    "bin.outdatedSub": "baryon.ai requires the latest version.",
    "bin.outdatedRun": "to update.",
    "pi.notInstalled": "{pkg} is not installed. Run: npm install -g @baryonlabs/cli",
    "bin.piVersion": "pi {version}",
    "bin.unconfiguredTTY": "Not configured yet.",
    "bin.unconfiguredTTYRun": "will run first.",
    "bin.unconfigured": "No configuration found.",
    "bin.unconfiguredRun": "first.",
    "bin.prunedConflicts": "Cleaned up conflicting extensions: {names}",
    "bin.room": "🏫 {project} · seat {seat}",
    "bin.roomInactive": "🚫 {project} (inactive) · seat {seat}",
    "edge.notInstalled": "Baryon Edge (Enterprise) not installed — read-only data sandbox:",
  },
};

/** Interpolate {name}-style placeholders from `vars`. Missing → left as-is. */
function interpolate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m,
  );
}

/**
 * Look up `key` for the active locale, interpolate `vars`, and fall back to
 * Korean (then to the key string itself) if missing. Never throws.
 */
export function t(key, vars = {}) {
  let locale;
  try {
    locale = getLocale();
  } catch {
    locale = "ko";
  }
  const fromLocale = MESSAGES[locale]?.[key];
  const fromKo = MESSAGES.ko[key];
  const template = fromLocale != null ? fromLocale : fromKo != null ? fromKo : key;
  try {
    return interpolate(template, vars || {});
  } catch {
    return template;
  }
}
