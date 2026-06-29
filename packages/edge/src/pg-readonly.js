// Baryon Edge — Postgres READ-ONLY MCP server.
//
// Exposes `pg_schema` and `pg_query` (SELECT-only) to the agent. Defense in depth:
//   1) sql-guard rejects anything but a single SELECT/CTE-SELECT,
//   2) every query runs in a `BEGIN READ ONLY` transaction with a statement
//      timeout, and
//   3) you should still point EDGE_PG_URL at a least-privilege (SELECT-only)
//      role on a read replica.
// No write path is ever exposed. Data leaves only as query results to the model.
import pg from "pg";
import { createServer } from "./mcp-stdio.js";
import { validateSelectOnly } from "./sql-guard.js";

const URL = process.env.EDGE_PG_URL || "";
const MAX_ROWS = Number(process.env.EDGE_PG_MAX_ROWS || "200");
const TIMEOUT_MS = Number(process.env.EDGE_PG_TIMEOUT_MS || "10000");

if (!URL) {
  process.stderr.write("pg-readonly: EDGE_PG_URL not set\n");
  process.exit(2);
}

const pool = new pg.Pool({ connectionString: URL, max: 4, statement_timeout: TIMEOUT_MS });

async function readOnly(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    await client.query(`SET LOCAL statement_timeout = ${TIMEOUT_MS}`);
    const r = await fn(client);
    await client.query("ROLLBACK"); // read-only → nothing to commit
    return r;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    throw e;
  } finally {
    client.release();
  }
}

createServer({
  name: "baryon-edge-postgres",
  version: "0.1.0",
  tools: [
    {
      name: "pg_schema",
      description:
        "List readable tables and their columns (information_schema). No arguments.",
      inputSchema: { type: "object", properties: {} },
      handler: async () => {
        const rows = await readOnly(async (c) => {
          const { rows } = await c.query(
            `select table_schema, table_name, column_name, data_type
             from information_schema.columns
             where table_schema not in ('pg_catalog','information_schema')
             order by table_schema, table_name, ordinal_position
             limit 2000`,
          );
          return rows;
        });
        return JSON.stringify(rows);
      },
    },
    {
      name: "pg_query",
      description:
        "Run ONE read-only SQL query (SELECT or WITH … SELECT only). " +
        "Writes/DDL/multi-statement are rejected. Returns up to " +
        `${MAX_ROWS} rows as JSON.`,
      inputSchema: {
        type: "object",
        properties: { sql: { type: "string", description: "A single SELECT query" } },
        required: ["sql"],
      },
      handler: async ({ sql }) => {
        const v = validateSelectOnly(sql);
        if (!v.ok) throw new Error(`거부됨: ${v.reason}`);
        const rows = await readOnly(async (c) => {
          const res = await c.query(sql);
          return res.rows.slice(0, MAX_ROWS);
        });
        const truncated = rows.length >= MAX_ROWS ? ` (상위 ${MAX_ROWS}행으로 제한)` : "";
        return JSON.stringify(rows) + (truncated ? `\n${truncated}` : "");
      },
    },
  ],
});
