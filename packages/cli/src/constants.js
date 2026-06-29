import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

/** This CLI's version (from package.json). Sent to the gateway for the
 *  minimum-version gate, so old clients are forced to update. */
export const CLIENT_VERSION = (() => {
  try {
    return createRequire(import.meta.url)("../package.json").version;
  } catch {
    return "0.0.0";
  }
})();

/** Provider id registered inside pi's models.json */
export const PROVIDER = "baryon";

/** Default OpenAI-compatible endpoint for baryon.ai. Override with BARYON_BASE_URL. */
export const DEFAULT_BASE_URL =
  process.env.BARYON_BASE_URL || "https://api.baryon.ai/v1";

/** Env var pi resolves at request time (apiKey: "$BARYON_API_KEY"). */
export const API_KEY_ENV = "BARYON_API_KEY";

/**
 * Session id env var. The baryon provider sends it as `X-Baryon-Session` so the
 * gateway can group every turn of one `baryon` run into a single session. A
 * fresh id is minted per launch (see pi.js). The gateway requires it.
 */
export const SESSION_ID_ENV = "BARYON_SESSION_ID";
export const SESSION_HEADER = "X-Baryon-Session";

/**
 * Client-identity header. The baryon provider sends `baryon-cli/<version>` so
 * the gateway can enforce a minimum CLI version (BARYON_MIN_CLI_VERSION). The
 * value is resolved per launch from BARYON_CLIENT (see pi.js).
 */
export const CLIENT_ENV = "BARYON_CLIENT";
export const CLIENT_HEADER = "X-Baryon-Client";

/** Underlying coding agent package + binary. */
export const PI_PACKAGE = "@earendil-works/pi-coding-agent";
export const PI_BIN = "pi";

/** Baryon-side config (api key, base url, default model). */
export const BARYON_DIR = path.join(os.homedir(), ".baryon");
export const BARYON_CONFIG = path.join(BARYON_DIR, "config.json");

/** pi's custom-provider/model registry. */
export const PI_AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
export const PI_MODELS_JSON = path.join(PI_AGENT_DIR, "models.json");
/** pi's extension registry — a `{ packages: [<git url>, …] }` list loaded on startup. */
export const PI_SETTINGS_JSON = path.join(PI_AGENT_DIR, "settings.json");
/** pi auto-discovers Agent Skills here (a folder per skill with a SKILL.md). */
export const PI_SKILLS_DIR = path.join(PI_AGENT_DIR, "skills");

/**
 * Fallback model catalog used when /models discovery is unavailable
 * (e.g. offline setup). Institutions adjust these to match their plan.
 * `context` / `max` are conservative defaults; pi tolerates overrides.
 */
export const DEFAULT_MODELS = [
  {
    id: "baryon-coder",
    name: "Baryon Coder",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
  },
  {
    id: "baryon-coder-mini",
    name: "Baryon Coder Mini",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
  },
];

/**
 * Extensions installed by default so `baryon` ships with sub-agents, a canvas,
 * an interactive shell, and web access/search out of the box. Installed via
 * `pi install <src>` into ~/.pi/agent/settings.json (loaded on startup).
 *
 * Curated for conflict-free startup (verified in a clean container):
 *  - pi-search removed — it registers a `web_fetch` tool that collides with
 *    pi-web-fetch, hard-failing extension load on every run.
 *  - pi-web-fetch removed — requires `puppeteer` (chromium download), which is
 *    absent in fresh/CI environments, so the extension fails to load. pi-web-access
 *    already provides browsing + fetch_content + web_search without that dependency.
 */
export const DEFAULT_EXTENSIONS = [
  { name: "pi-canvas", src: "https://github.com/jyaunches/pi-canvas", note: "캔버스" },
  { name: "pi-interactive-shell", src: "https://github.com/nicobailon/pi-interactive-shell", note: "인터랙티브 셸" }
];

/**
 * Extensions previously shipped as defaults that BREAK startup and must be
 * actively removed from existing installs (settings.json + cloned dir):
 *  - pi-web-fetch: `web_fetch` collides with pi-search; also needs puppeteer.
 *  - pi-search: `web_fetch` collision; superseded by pi-web-access.
 * `baryon setup` self-heals an already-broken machine by pruning these.
 */
export const DEPRECATED_EXTENSIONS = [
  { name: "pi-web-fetch", src: "https://github.com/georgebashi/pi-web-fetch", owner: "georgebashi" },
  { name: "pi-search", src: "https://github.com/buddingnewinsights/pi-search", owner: "buddingnewinsights" },
  // pi ≥0.78: ships a built-in `subagent` tool → cloned pi-subagents conflicts
  // ("Tool subagent conflicts"). pi-web-access imports the dropped pi-ai `/compat`
  // path → "Cannot find module …/pi-ai/dist/index.js/compat". Both hard-fail
  // startup; prune from existing installs. (web search remains via pi-parallel-web-search.)
  { name: "pi-subagents", src: "https://github.com/nicobailon/pi-subagents", owner: "nicobailon" },
  { name: "pi-web-access", src: "https://github.com/nicobailon/pi-web-access", owner: "nicobailon" },
  // pi ≥0.78 ships a built-in `websearch` (Wikipedia-backed web_search + web_fetch,
  // NO key). pi-parallel-web-search needs PARALLEL_API_KEY → "web_search: PARALLEL_API_KEY
  // not set — tool disabled" noise + redundant. Prune it; search stays via built-in.
  { name: "pi-parallel-web-search", src: "https://github.com/philipp-spiess/pi-parallel-web-search", owner: "philipp-spiess" }
];

/**
 * Default Agent Skills pack (P1). pi natively supports Anthropic's document
 * skills (pdf/pptx/xlsx) and auto-discovers them from ~/.pi/agent/skills/.
 * All three live as subfolders of one repo, so we shallow-clone once and copy.
 *
 * License note: anthropics/skills document skills are *source-available* and
 * "for demonstration and educational purposes only" — fits Baryon's教育/내부
 * use. Revisit if redistributed commercially. (See multi-client TODO.)
 */
export const SKILLS_REPO = "https://github.com/anthropics/skills";
// `source: "repo"` → copied from a subdir of SKILLS_REPO (shallow clone).
// `source: "bundled"` → shipped inside this npm package under skills/<name>/.
export const DEFAULT_SKILLS = [
  { name: "pdf", source: "repo", subdir: "skills/pdf", note: "PDF 처리(추출·폼·병합·생성)" },
  { name: "pptx", source: "repo", subdir: "skills/pptx", note: "슬라이드 초안 생성·편집" },
  { name: "xlsx", source: "repo", subdir: "skills/xlsx", note: "데이터 분석·스프레드시트" },
  { name: "agent-browser", source: "bundled", note: "웹/ERP 브라우저 자동화" }
];

export const HOMEPAGE = "https://cli.baryon.ai";
export const SUPPORT_EMAIL = "support@baryon.ai";

/**
 * Where end users issue / rotate / revoke their baryon.ai key.
 * vibecamp.us is the source of truth for key issuance, scope, quota and
 * revocation. Keys look like `vc_live_…`. Override with BARYON_KEYS_URL.
 */
export const KEYS_URL = process.env.BARYON_KEYS_URL || "https://vibecamp.us/dashboard";
export const KEY_PREFIX = "vc_live_";
