import { eq, lt, sql } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { registrations, registrationRateLimits } from "../db/schema.js";

export function getRegistrationStore() {
  const db = getDb();
  const receiptColumns = { reference: registrations.reference, payloadHash: registrations.payloadHash };
  async function findByKey(key) {
    const rows = await db.select(receiptColumns).from(registrations)
      .where(eq(registrations.idempotencyKey, key)).limit(1);
    return rows[0] || null;
  }
  return {
    findByKey,
    async create(application) {
      const rows = await db.insert(registrations).values(application)
        .onConflictDoNothing({ target: registrations.idempotencyKey }).returning(receiptColumns);
      if (rows[0]) return { ...rows[0], created: true };
      const existing = await findByKey(application.idempotencyKey);
      if (!existing) throw new Error("Unable to persist the application.");
      return { ...existing, created: false };
    },
    async consumeRateLimit(bucket, expiresAt, timestamp) {
      const results = await db.batch([
        db.delete(registrationRateLimits).where(lt(registrationRateLimits.expiresAt, timestamp)),
        db.insert(registrationRateLimits).values({ bucket, attempts: 1, expiresAt })
          .onConflictDoUpdate({ target: registrationRateLimits.bucket, set: { attempts: sql`${registrationRateLimits.attempts} + 1` } })
          .returning({ attempts: registrationRateLimits.attempts }),
      ]);
      return results[1][0].attempts;
    },
  };
}
