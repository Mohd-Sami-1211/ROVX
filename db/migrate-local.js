import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

/** Apply the same reviewed schema migrations used by D1, outside request handling. */
export function migrateLocalDatabase(databasePath, migrationsDirectory = resolve("drizzle")) {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  let applied = 0;
  try {
    db.exec("PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;");
    db.exec("CREATE TABLE IF NOT EXISTS _rovx_migrations (tag TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at INTEGER NOT NULL)");
    const journal = JSON.parse(readFileSync(resolve(migrationsDirectory, "meta/_journal.json"), "utf8"));
    const lookup = db.prepare("SELECT checksum FROM _rovx_migrations WHERE tag = ?");
    const record = db.prepare("INSERT INTO _rovx_migrations (tag, checksum, applied_at) VALUES (?, ?, ?)");
    for (const entry of journal.entries) {
      if (!/^[a-zA-Z0-9_-]+$/.test(entry.tag)) throw new Error("Invalid migration tag.");
      const sql = readFileSync(resolve(migrationsDirectory, `${entry.tag}.sql`), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      db.exec("BEGIN IMMEDIATE");
      try {
        const existing = lookup.get(entry.tag);
        if (existing && existing.checksum !== checksum) throw new Error(`Previously applied migration changed: ${entry.tag}`);
        if (!existing) {
          db.exec(sql);
          record.run(entry.tag, checksum, Date.now());
          applied++;
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
  } finally {
    db.close();
  }
  return applied;
}
