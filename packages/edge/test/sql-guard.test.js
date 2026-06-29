import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSelectOnly, keyInScope } from "../src/sql-guard.js";

test("allows plain SELECT and CTE SELECT", () => {
  assert.ok(validateSelectOnly("SELECT * FROM parts WHERE lot = '123'").ok);
  assert.ok(validateSelectOnly("  select id, name from t limit 10;").ok);
  assert.ok(validateSelectOnly("WITH x AS (SELECT 1 a) SELECT * FROM x").ok);
  assert.ok(validateSelectOnly("/* c */ SELECT 1 -- trailing").ok);
});

test("rejects data-modifying statements", () => {
  for (const q of [
    "INSERT INTO t VALUES (1)",
    "UPDATE t SET a=1",
    "DELETE FROM t",
    "DROP TABLE t",
    "ALTER TABLE t ADD c int",
    "TRUNCATE t",
    "CREATE TABLE t(a int)",
    "GRANT ALL ON t TO x",
    "MERGE INTO t ...",
  ]) {
    assert.equal(validateSelectOnly(q).ok, false, q);
  }
});

test("rejects multi-statement / injection", () => {
  assert.equal(validateSelectOnly("SELECT 1; DROP TABLE t").ok, false);
  assert.equal(validateSelectOnly("SELECT 1; SELECT 2").ok, false);
  assert.equal(validateSelectOnly("SELECT 1 -- ;\n; DELETE FROM t").ok, false);
});

test("rejects data-modifying CTE", () => {
  assert.equal(
    validateSelectOnly("WITH d AS (DELETE FROM t RETURNING *) SELECT * FROM d").ok,
    false,
  );
});

test("rejects SET/COPY/dangerous funcs", () => {
  assert.equal(validateSelectOnly("SET ROLE admin").ok, false);
  assert.equal(validateSelectOnly("COPY t TO PROGRAM 'curl evil'").ok, false);
  assert.equal(validateSelectOnly("SELECT pg_read_file('/etc/passwd')").ok, false);
  assert.equal(validateSelectOnly("SELECT * FROM dblink('...', '...')").ok, false);
});

test("rejects empty", () => {
  assert.equal(validateSelectOnly("").ok, false);
  assert.equal(validateSelectOnly("   ").ok, false);
  assert.equal(validateSelectOnly("/* only comment */").ok, false);
});

test("keyInScope enforces prefix + no traversal", () => {
  assert.ok(keyInScope("lot/123/a.json", "lot/"));
  assert.equal(keyInScope("other/x", "lot/"), false);
  assert.equal(keyInScope("lot/../secrets", "lot/"), false);
  assert.ok(keyInScope("anything", "")); // no prefix → bucket-wide read
});
