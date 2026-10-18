import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";
import { migrateLocalDatabase } from "../db/migrate-local.js";

const scratchRoot = resolve("work/runtime-checks");
mkdirSync(scratchRoot, { recursive: true });
const directory = mkdtempSync(join(scratchRoot, "next-"));
const databasePath = join(directory, "registrations.sqlite");
migrateLocalDatabase(databasePath);
const probe = createServer();
await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(0, "127.0.0.1", resolve); });
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(), windowsHide: true,
  env: { ...process.env, ROVX_SQLITE_PATH: databasePath, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stdout.on("data", (chunk) => { logs += chunk.toString(); });
child.stderr.on("data", (chunk) => { logs += chunk.toString(); });
let exited = false;
const closed = new Promise((resolve) => child.once("close", () => { exited = true; resolve(); }));
const post = (body) => fetch(`${origin}/api/registrations`, {
  method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 100 && !exited; attempt++) {
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(2000) });
      if (response.ok) { assert.match(await response.text(), /ROVX/i); ready = true; break; }
    } catch { /* The child may still be starting. */ }
    await delay(250);
  }
  assert.ok(ready, `Native Next server did not become ready.\n${logs.slice(-3000)}`);
  const payload = {
    fullName: "Runtime Test Driver", email: "runtime-check@example.test", phone: "+919000000002", city: "Bhaderwah",
    vehicleMake: "Test", vehicleModel: "Test vehicle", vehicleYear: 2024, driveType: "4x4",
    experience: "enthusiast", consent: true, idempotencyKey: crypto.randomUUID(),
  };
  const created = await post(payload);
  assert.equal(created.status, 201, await created.clone().text());
  const receipt = await created.json();
  const retry = await post(payload);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).reference, receipt.reference);
  assert.equal((await post({ ...payload, city: "Jammu" })).status, 409);
  assert.equal((await post({ ...payload, consent: false })).status, 400);
  assert.equal((await fetch(`${origin}/api/registrations`)).status, 405);
  const db = new DatabaseSync(databasePath);
  try { assert.equal(db.prepare("SELECT COUNT(*) AS total FROM registrations").get().total, 1); }
  finally { db.close(); }
  console.log("Native Next runtime passed: page 200, application 201, replay 200, conflict 409, invalid 400, private GET 405, one durable SQLite record.");
} finally {
  if (!exited) child.kill();
  await Promise.race([closed, delay(5000)]);
  if (!exited) throw new Error("Temporary Next server did not exit; scratch database retained.");
  assert.ok(directory.startsWith(scratchRoot + "\\") || directory.startsWith(scratchRoot + "/"));
  rmSync(directory, { recursive: true, force: true });
}
