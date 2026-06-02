import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BIN = fileURLToPath(new URL("../bin/baryon.js", import.meta.url));

function runBin(args, env = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1", ...env },
  });
}

test("help exits 0 and prints usage", () => {
  const r = runBin(["help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /USAGE/);
  assert.match(r.stdout, /baryon setup/);
});

test("_welcome never fails", () => {
  const r = runBin(["_welcome"]);
  assert.equal(r.status, 0);
});

test("api.discoverModels maps OpenAI /models shape", async () => {
  const { discoverModels } = await import("../src/api.js");
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ data: [{ id: "m1" }, { id: "m2", name: "Two" }] }),
  });
  try {
    const models = await discoverModels("https://x/v1", "k");
    assert.equal(models.length, 2);
    assert.equal(models[0].id, "m1");
    assert.equal(models[1].name, "Two");
    assert.ok(models[0].contextWindow > 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("syncPiModels preserves existing providers", async () => {
  // Use a temp HOME so we don't touch the real ~/.pi
  const os = await import("node:os");
  const fs = await import("node:fs");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "baryon-test-"));
  const env = { HOME: tmp, USERPROFILE: tmp };
  // run via subprocess so constants pick up the temp HOME
  const script = `
    import { syncPiModels } from ${JSON.stringify(fileURLToPath(new URL("../src/config.js", import.meta.url)))};
    import fs from "node:fs"; import path from "node:path"; import os from "node:os";
    const dir = path.join(os.homedir(), ".pi", "agent");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "models.json"), JSON.stringify({ providers: { ollama: { baseUrl: "x" } } }));
    syncPiModels({ baseUrl: "https://api.baryon.ai/v1", models: [{ id: "baryon-coder" }] });
    const out = JSON.parse(fs.readFileSync(path.join(dir, "models.json"), "utf8"));
    if (!out.providers.ollama) throw new Error("dropped ollama");
    if (!out.providers.baryon) throw new Error("missing baryon");
    if (out.providers.baryon.headers["X-Baryon-Session"] !== "$BARYON_SESSION_ID")
      throw new Error("missing session header");
    console.log("OK");
  `;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /OK/);
});
