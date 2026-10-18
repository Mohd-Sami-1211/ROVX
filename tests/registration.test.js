import assert from "node:assert/strict";
import test from "node:test";
import { createRegistrationHandler, MAX_APPLICATIONS_PER_WINDOW, MAX_BODY_BYTES } from "../lib/registration.js";

const origin = "https://rovx.example";
const valid = () => ({
  fullName: "  Sam Driver  ", email: "DRIVER@example.com", phone: "+91 98765 43210", city: "Bhaderwah",
  vehicleMake: "Mahindra", vehicleModel: "Thar", vehicleYear: "2024", driveType: "4x4",
  experience: "enthusiast", consent: true, website: "", idempotencyKey: crypto.randomUUID(),
});

function request(data, headers = {}) {
  return new Request(`${origin}/api/registrations`, {
    method: "POST", headers: { origin, "content-type": "application/json", ...headers },
    body: typeof data === "string" ? data : JSON.stringify(data),
  });
}

function memoryStore() {
  const records = new Map();
  const buckets = new Map();
  return {
    records, buckets,
    async findByKey(key) { return records.get(key) || null; },
    async create(record) {
      const existing = records.get(record.idempotencyKey);
      if (existing) return { ...existing, created: false };
      records.set(record.idempotencyKey, record);
      return { ...record, created: true };
    },
    async consumeRateLimit(bucket) { const attempts = (buckets.get(bucket) || 0) + 1; buckets.set(bucket, attempts); return attempts; },
  };
}

test("a valid application is normalized, durably handed to storage, and returns a receipt without PII", async () => {
  const store = memoryStore();
  const handle = createRegistrationHandler(() => store);
  const payload = valid();
  const response = await handle(request(payload));
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.match(body.reference, /^ROVX-26-[0-9A-F]{12}$/);
  assert.equal(body.status, "application_received");
  assert.equal(body.replayed, false);
  assert.equal(body.email, undefined);
  assert.equal(body.fullName, undefined);
  const record = store.records.get(payload.idempotencyKey);
  assert.equal(record.fullName, "Sam Driver");
  assert.equal(record.email, "driver@example.com");
  assert.equal(record.phone, "+919876543210");
  assert.equal(record.vehicleYear, 2024);
  assert.equal(record.status, "application_received");
  assert.equal(record.website, undefined);
});

test("retries return the same reference and changed payloads cannot reuse a submission key", async () => {
  const store = memoryStore();
  const handle = createRegistrationHandler(() => store);
  const payload = valid();
  const first = await (await handle(request(payload))).json();
  const retry = await handle(request(payload));
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).reference, first.reference);
  assert.equal(store.records.size, 1);
  const changed = await handle(request({ ...payload, vehicleModel: "Another car" }));
  assert.equal(changed.status, 409);
  assert.equal(store.records.size, 1);
});

test("concurrent submissions are resolved atomically without duplicate records", async () => {
  const store = memoryStore();
  const handle = createRegistrationHandler(() => store);
  const payload = valid();
  const responses = await Promise.all([handle(request(payload)), handle(request(payload))]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 201]);
  const receipts = await Promise.all(responses.map((response) => response.json()));
  assert.equal(receipts[0].reference, receipts[1].reference);
  assert.equal(store.records.size, 1);
});

test("a concurrent conflicting payload is rejected even after both initial lookups miss", async () => {
  const store = memoryStore();
  store.findByKey = async () => null;
  const handle = createRegistrationHandler(() => store);
  const payload = valid();
  const responses = await Promise.all([handle(request(payload)), handle(request({ ...payload, city: "Jammu" }))]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
  assert.equal(store.records.size, 1);
});

test("invalid fields, missing consent, honeypots and overlong input are rejected before accessing storage", async () => {
  let accesses = 0;
  const handle = createRegistrationHandler(() => { accesses++; throw new Error("must not be called"); });
  for (const patch of [
    { email: "invalid" }, { consent: false }, { website: "spam.example" },
    { driveType: "unicycle" }, { vehicleYear: "" }, { vehicleYear: "2028" },
    { phone: "123" }, { notes: "a".repeat(1201) }, { fullName: "Sam\u0000Driver" },
    { unexpected: "field" }, { idempotencyKey: "not-a-uuid" },
  ]) {
    const response = await handle(request({ ...valid(), ...patch }));
    assert.equal(response.status, 400, JSON.stringify(patch));
    assert.ok((await response.json()).fieldErrors);
  }
  assert.equal(accesses, 0);
});

test("cross-origin and malformed requests are rejected before accessing storage", async () => {
  const handle = createRegistrationHandler(() => { throw new Error("must not be called"); });
  assert.equal((await handle(request(valid(), { origin: "https://attacker.example" }))).status, 403);
  assert.equal((await handle(request(valid(), { origin: "null" }))).status, 403);
  assert.equal((await handle(request(valid(), { "sec-fetch-site": "cross-site" }))).status, 403);
  assert.equal((await handle(request(valid(), { "content-type": "text/plain" }))).status, 415);
  assert.equal((await handle(request("not JSON"))).status, 400);
});

test("body size is enforced with or without a trustworthy Content-Length", async () => {
  const handle = createRegistrationHandler(() => { throw new Error("must not be called"); });
  assert.equal((await handle(request(valid(), { "content-length": String(MAX_BODY_BYTES + 1) }))).status, 413);
  assert.equal((await handle(request('"' + "a".repeat(MAX_BODY_BYTES) + '"'))).status, 413);
  assert.equal((await handle(request('"' + "🌋".repeat(4000) + '"', { "content-length": "1" }))).status, 413);
});

test("same-origin validation uses the actual Host when Next normalizes its internal request URL", async () => {
  const store = memoryStore();
  const handle = createRegistrationHandler(() => store);
  const makeRequest = (originHeader) => new Request("http://localhost:3000/api/registrations", {
    method: "POST", headers: { origin: originHeader, host: "127.0.0.1:3000", "content-type": "application/json" },
    body: JSON.stringify(valid()),
  });
  assert.equal((await handle(makeRequest("http://127.0.0.1:3000"))).status, 201);
  assert.equal((await handle(makeRequest("http://localhost:3000"))).status, 403);
  assert.equal((await handle(makeRequest("https://127.0.0.1:3000"))).status, 403);
  assert.equal((await handle(makeRequest("http://attacker.example"))).status, 403);
});

test("rate limiting uses hashed buckets and replaying a saved request does not consume quota", async () => {
  const store = memoryStore();
  const handle = createRegistrationHandler(() => store, { now: () => 1000000 });
  const headers = { "cf-connecting-ip": "203.0.113.1" };
  const first = valid();
  assert.equal((await handle(request(first, headers))).status, 201);
  for (let index = 1; index < MAX_APPLICATIONS_PER_WINDOW; index++) assert.equal((await handle(request(valid(), headers))).status, 201);
  assert.equal((await handle(request(first, headers))).status, 200);
  const limited = await handle(request(valid(), headers));
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(store.records.size, MAX_APPLICATIONS_PER_WINDOW);
  assert.match([...store.buckets.keys()][0], /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify([...store.records.values()]).includes("203.0.113.1"));
});

test("database failures never produce a false success or expose internal details", async () => {
  const handle = createRegistrationHandler(() => { throw new Error("private database details"); });
  const response = await handle(request(valid()));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.reference, undefined);
  assert.ok(!JSON.stringify(body).includes("private database details"));
});
