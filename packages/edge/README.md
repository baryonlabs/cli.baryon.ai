# Baryon Edge (Enterprise)

Run a Baryon/pi agent on **outsourced or network-isolated infrastructure** where it
may **read** internal Postgres and object storage (MinIO/S3) **but cannot write,
and cannot send internal data anywhere** except the LLM gateway.

> Enterprise feature. Sold/deployed with the on-prem (폐쇄망) tier, separate from the
> open `@baryonlabs/cli`.

## Threat model

A capable agent is useful only if it can see real data — but giving it a DB
password or S3 keys normally means it can also **write** and **exfiltrate**. Baryon
Edge removes both, with **defense in depth across two layers**:

### 1) Read-only data plane (MCP tools)
The agent never gets raw credentials. It reads through two read-only MCP servers:

- **Postgres** (`pg_schema`, `pg_query`): `SELECT`/`WITH … SELECT` only.
  - `sql-guard` rejects DML/DDL/multi-statement/`COPY … PROGRAM`/`pg_read_file`/`dblink`/… (unit-tested).
  - every query runs in `BEGIN TRANSACTION READ ONLY` with a statement timeout.
  - you still point `EDGE_PG_URL` at a **least-privilege (SELECT-only) role on a read replica**.
- **Object store** (`s3_list`, `s3_stat`, `s3_get`): **GET-only**, scoped to one
  bucket + optional prefix. There is **no** put/delete/copy tool, so nothing can be
  written or exfiltrated to storage. Path-style addressing → MinIO compatible.

No write path is exposed anywhere. Data leaves only as query/object results to the model.

### 2) Network jail (no egress)
The `docker-compose.yml` puts the agent on an `internal: true` network (no default
route) with Postgres + MinIO, and its only path off-box is an **egress allowlist
proxy** that permits exactly one host — the LLM gateway. Arbitrary HTTP is denied,
so internal data cannot be POSTed out. For a fully air-gapped site (internal vLLM),
drop the proxy entirely → **zero outbound**.

## Quick start (CLI profile — layer 1)

```bash
npm install -g @baryonlabs/cli @baryonlabs/edge

export EDGE_PG_URL="postgres://readonly:***@replica:5432/app"   # SELECT-only role
export EDGE_S3_ENDPOINT="http://minio.internal:9000"
export EDGE_S3_BUCKET="lots"
export EDGE_S3_PREFIX="2026/"          # optional read scope
export EDGE_S3_ACCESS_KEY="…"  EDGE_S3_SECRET_KEY="…"
export BARYON_API_KEY="vc_live_…"

baryon-edge --check     # validate config (creds masked)
baryon-edge             # launches the agent with read-only pg_* / s3_* tools
```

Or persist config at `~/.baryon/edge.json`:

```json
{
  "pg":  { "url": "postgres://readonly:***@replica:5432/app" },
  "s3":  { "endpoint": "http://minio.internal:9000", "bucket": "lots", "prefix": "2026/",
           "accessKey": "…", "secretKey": "…" }
}
```

The launcher registers the read-only MCP servers into pi's `mcp.json` (secrets are
referenced as `${VAR}`, **never written to disk**) and restores it on exit.

## Hard isolation (Docker profile — layer 2)

```bash
PG_PASSWORD=… S3_ACCESS_KEY=… S3_SECRET_KEY=… BARYON_API_KEY=vc_live_… \
  docker compose run --rm agent
```

- `agent` + `postgres` + `minio` share an **internal** network (no internet).
- `egress-proxy` (squid, `squid-allowlist.conf`) allows **only** the LLM gateway.
- Edit `squid-allowlist.conf` for your gateway / internal vLLM host.

## Configuration

| Env | Meaning |
| --- | --- |
| `EDGE_PG_URL` | Postgres DSN — **use a SELECT-only role on a read replica** |
| `EDGE_PG_MAX_ROWS` | row cap per query (default 200) |
| `EDGE_PG_TIMEOUT_MS` | statement timeout (default 10000) |
| `EDGE_S3_ENDPOINT` | MinIO/S3 endpoint (omit for AWS) |
| `EDGE_S3_BUCKET` / `EDGE_S3_PREFIX` | read scope |
| `EDGE_S3_ACCESS_KEY` / `EDGE_S3_SECRET_KEY` / `EDGE_S3_REGION` | read-only creds |
| `EDGE_S3_MAX_BYTES` | per-object read cap (default 1 MiB) |

## What this does NOT do (be honest)

- The CLI profile alone does not block the OS network — pi's shell could still
  reach the network. **Use the Docker profile (or an equivalent host firewall /
  network namespace) for the hard no-egress guarantee.**
- Read-only is enforced by the MCP tools + DB role; always also use a least-priv DB
  user + read replica (don't point at primary with a superuser).
- Audit: pair with the gateway's usage/flow logging to record every model call.

## Tests

```bash
npm test   # sql-guard: SELECT-only + injection/CTE-write/COPY/func denylist + S3 prefix scope
```
