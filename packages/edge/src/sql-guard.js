// Read-only SQL guard for the Baryon Edge Postgres MCP server.
//
// Defense in depth: this is the FIRST gate (allowlist start + denylist keywords +
// single statement). The server ALSO runs every query inside a READ ONLY
// transaction against a least-privilege (SELECT-only) role, so a bypass here
// still cannot write. Keep this strict and conservative — reject when unsure.

// Statement-modifying / dangerous keywords (whole-word match, case-insensitive).
const FORBIDDEN = [
  "insert", "update", "delete", "merge", "upsert",
  "drop", "alter", "create", "truncate", "rename",
  "grant", "revoke", "comment", "security",
  "copy", "call", "do", "execute", "prepare", "deallocate",
  "vacuum", "analyze", "reindex", "cluster", "refresh",
  "lock", "set", "reset", "begin", "commit", "rollback", "savepoint",
  "listen", "notify", "discard", "load", "import",
];

// Dangerous functions / patterns even within a SELECT (filesystem, network, exec).
const FORBIDDEN_PATTERNS = [
  /\bpg_read_file\b/i,
  /\bpg_read_binary_file\b/i,
  /\bpg_ls_dir\b/i,
  /\bpg_stat_file\b/i,
  /\blo_import\b/i,
  /\blo_export\b/i,
  /\bdblink\b/i,
  /\bpg_sleep\b/i,
  /\bcopy\b[\s\S]*\bprogram\b/i,
  /\binto\s+(outfile|dumpfile)\b/i,
];

/** Strip SQL comments (-- line and /* block *​/) and surrounding whitespace. */
function stripComments(sql) {
  return String(sql)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .trim();
}

/**
 * Validate that `sql` is a single, read-only statement.
 * Returns { ok: true } or { ok: false, reason }.
 */
export function validateSelectOnly(sql) {
  if (typeof sql !== "string" || sql.trim() === "") {
    return { ok: false, reason: "빈 쿼리입니다." };
  }

  const cleaned = stripComments(sql);
  if (cleaned === "") return { ok: false, reason: "빈 쿼리입니다." };

  // Single statement only: allow at most one trailing semicolon.
  const withoutTrailing = cleaned.replace(/;\s*$/, "");
  if (withoutTrailing.includes(";")) {
    return { ok: false, reason: "다중 문장(;)은 허용되지 않습니다. 단일 SELECT만 가능합니다." };
  }

  // Must START with SELECT or WITH (CTE) — allowlist.
  if (!/^\s*(select|with)\b/i.test(withoutTrailing)) {
    return { ok: false, reason: "SELECT(또는 WITH … SELECT) 쿼리만 허용됩니다." };
  }

  const lower = withoutTrailing.toLowerCase();

  // Whole-word forbidden keywords (covers data-modifying CTEs like
  // `WITH x AS (DELETE …) SELECT …`).
  for (const kw of FORBIDDEN) {
    if (new RegExp(`\\b${kw}\\b`, "i").test(lower)) {
      return { ok: false, reason: `금지된 키워드 사용: ${kw.toUpperCase()} (읽기 전용만 허용)` };
    }
  }

  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(withoutTrailing)) {
      return { ok: false, reason: `금지된 함수/패턴 사용: ${re}` };
    }
  }

  return { ok: true };
}

/** Validate an S3/MinIO object key stays within the allowed prefix (read scope). */
export function keyInScope(key, prefix) {
  if (typeof key !== "string" || key === "") return false;
  if (key.includes("..")) return false; // no traversal
  const p = prefix || "";
  return key.startsWith(p);
}
