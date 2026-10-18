import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { migrateLocalDatabase } from "../db/migrate-local.js";
import { openRegistrationStore } from "../lib/registration-store.node.js";
import { createRegistrationHandler } from "../lib/registration.js";

const scratchRoot = resolve("work/test-databases");
mkdirSync(scratchRoot, { recursive: true });
const application = () => ({
  fullName: "Test Driver", email: "test-driver@example.test", phone: "+919000000001", city: "Bhaderwah",
  vehicleMake: "Test make", vehicleModel: "Test vehicle", vehicleYear: 2024, driveType: "4x4",
  experience: "enthusiast", consent: true, idempotencyKey: crypto.randomUUID(),
});
const request = (data) => new Request("http://localhost:3000/api/registrations", {
  method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" },
  body: JSON.stringify(data),
});

function fixture(t) {
  const directory = mkdtempSync(join(scratchRoot, "case-"));
  const filename = join(directory, "registrations.sqlite");
  const handles = new Set();
  t.after(() => {
    for (const handle of handles) handle.close();
    assert.ok(directory.startsWith(scratchRoot + "\\") || directory.startsWith(scratchRoot + "/"));
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    filename,
    open() { const store = openRegistrationStore(filename); handles.add(store); return store; },
    close(store) { store.close(); handles.delete(store); },
    inspect(sql) { const db = new DatabaseSync(filename); try { return db.prepare(sql).all(); } finally { db.close(); } },
  };
}

test("real SQLite migrations are repeatable and registrations survive closing and reopening the database", async (t) => {
  const f = fixture(t);
  assert.equal(migrateLocalDatabase(f.filename), 1);
  assert.equal(migrateLocalDatabase(f.filename), 0);
  const payload = application();
  const firstStore = f.open();
  const response = await createRegistrationHandler(() => firstStore)(request(payload));
  assert.equal(response.status, 201);
  const receipt = await response.json();
  f.close(firstStore);
  const reopened = f.open();
  const handle = createRegistrationHandler(() => reopened);
  const retry = await handle(request(payload));
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).reference, receipt.reference);
  assert.equal((await handle(request({ ...payload, vehicleModel: "Changed" }))).status, 409);
  const rows = f.inspect("SELECT reference, status, consent FROM registrations");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].reference, receipt.reference);
  assert.equal(rows[0].status, "application_received");
  assert.equal(rows[0].consent, 1);
});

test("independent database connections enforce idempotency under concurrent handler submissions", async (t) => {
  const f = fixture(t);
  migrateLocalDatabase(f.filename);
  const one = f.open();
  const two = f.open();
  const payload = application();
  const responses = await Promise.all([
    createRegistrationHandler(() => one)(request(payload)),
    createRegistrationHandler(() => two)(request(payload)),
  ]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 201]);
  const receipts = await Promise.all(responses.map((response) => response.json()));
  assert.equal(receipts[0].reference, receipts[1].reference);
  assert.equal(f.inspect("SELECT COUNT(*) AS total FROM registrations")[0].total, 1);
});

test("SQLite rate limiting increments atomically and removes expired buckets", (t) => {
  const f = fixture(t);
  migrateLocalDatabase(f.filename);
  const store = f.open();
  assert.equal(store.consumeRateLimit("a".repeat(64), 1000, 500), 1);
  assert.equal(store.consumeRateLimit("a".repeat(64), 1000, 600), 2);
  assert.equal(store.consumeRateLimit("b".repeat(64), 2000, 1000), 1);
  const rows = f.inspect("SELECT bucket, attempts FROM registration_rate_limits");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].bucket, "b".repeat(64));
  assert.equal(rows[0].attempts, 1);
});

test("an unmigrated local database fails closed without falsely accepting applications", async (t) => {
  const f = fixture(t);
  const handle = createRegistrationHandler(() => openRegistrationStore(f.filename));
  const response = await handle(request(application()));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).reference, undefined);
});
