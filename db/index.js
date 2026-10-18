import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.js";

export function getDb() {
  if (!env.DB) throw new Error("The registration database is unavailable.");
  return drizzle(env.DB, { schema });
}
