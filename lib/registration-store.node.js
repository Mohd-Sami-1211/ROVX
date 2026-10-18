import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function registrationDatabasePath() {
  return resolve(process.env.ROVX_SQLITE_PATH || ".data/rovx.sqlite");
}

/** Native Next.js storage. This module is excluded from the Cloudflare bundle. */
export function openRegistrationStore(databasePath) {
  if (!existsSync(databasePath)) throw new Error("Run npm run db:migrate:local before accepting applications.");
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;");
  let find, insert, expire, rate;
  try {
    find = db.prepare("SELECT reference, payload_hash AS payloadHash FROM registrations WHERE idempotency_key = ? LIMIT 1");
    insert = db.prepare(`INSERT INTO registrations (
      id, reference, idempotency_key, payload_hash, event, status, full_name, email, phone, city,
      vehicle_make, vehicle_model, vehicle_year, drive_type, experience, team_name, notes, consent, consent_version, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(idempotency_key) DO NOTHING RETURNING reference, payload_hash AS payloadHash`);
    expire = db.prepare("DELETE FROM registration_rate_limits WHERE expires_at <= ?");
    rate = db.prepare(`INSERT INTO registration_rate_limits (bucket, attempts, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`);
  } catch (error) {
    db.close();
    throw error;
  }
  return {
    findByKey(key) { return find.get(key) || null; },
    create(application) {
      const row = insert.get(
        application.id, application.reference, application.idempotencyKey, application.payloadHash,
        application.event, application.status, application.fullName, application.email, application.phone,
        application.city, application.vehicleMake, application.vehicleModel, application.vehicleYear,
        application.driveType, application.experience, application.teamName, application.notes,
        application.consent ? 1 : 0, application.consentVersion, application.createdAt,
      );
      if (row) return { ...row, created: true };
      const existing = find.get(application.idempotencyKey);
      if (!existing) throw new Error("Unable to persist the application.");
      return { ...existing, created: false };
    },
    consumeRateLimit(bucket, expiresAt, timestamp) {
      db.exec("BEGIN IMMEDIATE");
      try {
        expire.run(timestamp);
        const result = rate.get(bucket, expiresAt);
        db.exec("COMMIT");
        return result.attempts;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    close() { db.close(); },
  };
}

const cacheKey = Symbol.for("rovx.node.registration-stores");
export function getRegistrationStore() {
  const databasePath = registrationDatabasePath();
  const stores = globalThis[cacheKey] ||= new Map();
  if (!stores.has(databasePath)) stores.set(databasePath, openRegistrationStore(databasePath));
  return stores.get(databasePath);
}
