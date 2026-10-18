import { migrateLocalDatabase } from "../db/migrate-local.js";
import { registrationDatabasePath } from "../lib/registration-store.node.js";

const databasePath = registrationDatabasePath();
const applied = migrateLocalDatabase(databasePath);
console.log(`Local registration database ready: ${databasePath} (${applied} new migrations).`);
