import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Applications are private records. Receiving one does not approve a race entry.
export const registrations = sqliteTable("registrations", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  payloadHash: text("payload_hash").notNull(),
  event: text("event").notNull().default("rovx-bhaderwah-26"),
  status: text("status").notNull().default("application_received"),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  vehicleMake: text("vehicle_make").notNull(),
  vehicleModel: text("vehicle_model").notNull(),
  vehicleYear: integer("vehicle_year").notNull(),
  driveType: text("drive_type").notNull(),
  experience: text("experience").notNull(),
  teamName: text("team_name").notNull().default(""),
  notes: text("notes").notNull().default(""),
  consent: integer("consent", { mode: "boolean" }).notNull(),
  consentVersion: text("consent_version").notNull().default("2026-10-15"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  uniqueIndex("registrations_idempotency_idx").on(table.idempotencyKey),
  uniqueIndex("registrations_reference_idx").on(table.reference),
  index("registrations_created_at_idx").on(table.createdAt),
]);

// Short-lived, one-way hashes only: never store visitors' raw IP addresses.
export const registrationRateLimits = sqliteTable("registration_rate_limits", {
  bucket: text("bucket").primaryKey(),
  attempts: integer("attempts").notNull().default(1),
  expiresAt: integer("expires_at").notNull(),
}, (table) => [index("registration_rate_limits_expiry_idx").on(table.expiresAt)]);
