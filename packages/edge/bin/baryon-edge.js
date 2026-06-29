#!/usr/bin/env node
// Baryon Edge launcher (ENTERPRISE) — run a pi-agent in a read-only data sandbox.
//
// Registers the read-only Postgres/MinIO MCP servers into pi's mcp.json (secrets
// referenced as ${VAR}, never written to disk), launches `baryon`, and restores
// mcp.json on exit. For the HARD network guarantee (no egress), run inside the
// bundled Docker profile (see README) — the CLI profile provides the read-only
// data plane + convenience; the container provides default-deny outbound.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, "..", "src");
const PI_AGENT_DIR = process.env.PI_CODING_AGENT_DIR || path.join(os.homedir(), ".pi", "agent");
const MCP_JSON = path.join(PI_AGENT_DIR, "mcp.json");
const EDGE_CONFIG = path.join(os.homedir(), ".baryon", "edge.json");

const log = (m) => process.stderr.write(m + "\n");

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

/** Resolve edge config: ~/.baryon/edge.json merged under the process env (env wins). */
function resolveConfig() {
  const f = readJson(EDGE_CONFIG, {});
  const pg = { url: process.env.EDGE_PG_URL || f.pg?.url || "" };
  const s3 = {
    endpoint: process.env.EDGE_S3_ENDPOINT || f.s3?.endpoint || "",
    bucket: process.env.EDGE_S3_BUCKET || f.s3?.bucket || "",
    prefix: process.env.EDGE_S3_PREFIX || f.s3?.prefix || "",
    region: process.env.EDGE_S3_REGION || f.s3?.region || "us-east-1",
    accessKey: process.env.EDGE_S3_ACCESS_KEY || f.s3?.accessKey || "",
    secretKey: process.env.EDGE_S3_SECRET_KEY || f.s3?.secretKey || "",
  };
  return { pg, s3 };
}

function buildServers(cfg) {
  const servers = {};
  if (cfg.pg.url) {
    servers["baryon-edge-postgres"] = {
      command: process.execPath,
      args: [path.join(SRC, "pg-readonly.js")],
      // Secrets stay as ${VAR}; real values come from the child process env.
      env: { EDGE_PG_URL: "${EDGE_PG_URL}", EDGE_PG_MAX_ROWS: "${EDGE_PG_MAX_ROWS}", EDGE_PG_TIMEOUT_MS: "${EDGE_PG_TIMEOUT_MS}" },
    };
  }
  if (cfg.s3.bucket) {
    servers["baryon-edge-objectstore"] = {
      command: process.execPath,
      args: [path.join(SRC, "minio-readonly.js")],
      env: {
        EDGE_S3_ENDPOINT: "${EDGE_S3_ENDPOINT}", EDGE_S3_BUCKET: "${EDGE_S3_BUCKET}",
        EDGE_S3_PREFIX: "${EDGE_S3_PREFIX}", EDGE_S3_REGION: "${EDGE_S3_REGION}",
        EDGE_S3_ACCESS_KEY: "${EDGE_S3_ACCESS_KEY}", EDGE_S3_SECRET_KEY: "${EDGE_S3_SECRET_KEY}",
      },
    };
  }
  return servers;
}

function childEnv(cfg) {
  const e = { ...process.env };
  if (cfg.pg.url) e.EDGE_PG_URL = cfg.pg.url;
  if (cfg.s3.bucket) {
    e.EDGE_S3_ENDPOINT = cfg.s3.endpoint;
    e.EDGE_S3_BUCKET = cfg.s3.bucket;
    e.EDGE_S3_PREFIX = cfg.s3.prefix;
    e.EDGE_S3_REGION = cfg.s3.region;
    e.EDGE_S3_ACCESS_KEY = cfg.s3.accessKey;
    e.EDGE_S3_SECRET_KEY = cfg.s3.secretKey;
  }
  e.EDGE_PG_MAX_ROWS = e.EDGE_PG_MAX_ROWS || "200";
  e.EDGE_PG_TIMEOUT_MS = e.EDGE_PG_TIMEOUT_MS || "10000";
  return e;
}

function main() {
  const args = process.argv.slice(2);
  const cfg = resolveConfig();
  const servers = buildServers(cfg);

  if (Object.keys(servers).length === 0) {
    log("⚠ Baryon Edge: EDGE_PG_URL 또는 EDGE_S3_BUCKET 중 하나는 설정해야 합니다.");
    log("  예: export EDGE_PG_URL=postgres://readonly:***@replica:5432/db");
    log("      export EDGE_S3_ENDPOINT=http://minio:9000 EDGE_S3_BUCKET=lots EDGE_S3_ACCESS_KEY=… EDGE_S3_SECRET_KEY=…");
    log(`  또는 ${EDGE_CONFIG} 작성.`);
    process.exit(2);
  }

  if (args[0] === "--check" || args[0] === "doctor") {
    log("Baryon Edge 구성:");
    if (cfg.pg.url) log(`  • Postgres(읽기전용): ${cfg.pg.url.replace(/:[^:@/]+@/, ":***@")}`);
    if (cfg.s3.bucket) log(`  • Object store(읽기전용): ${cfg.s3.endpoint || "(AWS)"} / ${cfg.s3.bucket}/${cfg.s3.prefix}`);
    log(`  • 등록 MCP 서버: ${Object.keys(servers).join(", ")}`);
    log("  • 쓰기/네트워크 egress는 노출되지 않음. 하드 차단은 Docker 프로파일 사용.");
    process.exit(0);
  }

  // Merge into mcp.json (preserve others), back up, restore on exit.
  fs.mkdirSync(PI_AGENT_DIR, { recursive: true });
  const original = fs.existsSync(MCP_JSON) ? fs.readFileSync(MCP_JSON, "utf8") : null;
  const root = readJson(MCP_JSON, {});
  root.mcpServers = { ...(root.mcpServers || {}), ...servers };
  fs.writeFileSync(MCP_JSON, JSON.stringify(root, null, 2) + "\n");

  const restore = () => {
    try {
      if (original === null) fs.rmSync(MCP_JSON, { force: true });
      else fs.writeFileSync(MCP_JSON, original);
    } catch { /* best-effort */ }
  };

  log(`🔒 Baryon Edge — 읽기전용 데이터 샌드박스 (${Object.keys(servers).join(", ")})`);
  log("   DB는 SELECT만 · 객체스토리지는 GET만 · 쓰기/외부전송 도구 없음.");

  const child = spawn("baryon", args, { stdio: "inherit", env: childEnv(cfg), shell: process.platform === "win32" });
  const onSig = () => { try { child.kill(); } catch { /* */ } };
  process.on("SIGINT", onSig);
  process.on("SIGTERM", onSig);
  child.on("error", (e) => { restore(); log(`baryon 실행 실패: ${e.message}`); process.exit(1); });
  child.on("exit", (code) => { restore(); process.exit(code ?? 0); });
}

main();
