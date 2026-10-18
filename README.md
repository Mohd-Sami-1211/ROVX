# ROVX–Bhaderwah 26

Next.js App Router website written in JavaScript and JSX for the first ROVX event on 13 December 2026. The same application runs under native Next.js or the Sites Vinext adapter for Cloudflare Workers.

## Run with Next.js

Use Node.js 22.13 or newer (Node 24 recommended) and npm.

```sh
npm ci
npm run db:migrate:local
npm run dev
```

Open `http://127.0.0.1:3000`. Local participant applications are stored durably in `.data/rovx.sqlite`, excluded from source control. Set `ROVX_SQLITE_PATH` to an absolute file path to use another persistent disk location. Run migrations with the same environment before starting the server.

```sh
npm test
npm run build
npm run test:next
npm start
```

Native Next commands use webpack with an explicit server storage alias. The runtime check starts a temporary server and test database, verifies HTTP registration behavior, then stops and removes them. A Node deployment needs persistent writable disk for SQLite. Stateless hosts need a durable database adapter; the bundled Sites deployment uses D1.

## Application flow

`POST /api/registrations` validates JSON, origin, request size and participant fields before writing. Every application has a unique submission key; retrying the same payload returns its original reference. A changed payload with that key is rejected. Applications require organizer review and do not imply payment or confirmed race entry.

Success responses are `201` for a new application and `200` for a replay, with `{ reference, status: "application_received", replayed, message }`. Invalid fields return `400` with `{ error, fieldErrors }`. No public participant listing is exposed. The form preserves its exact payload and submission key when a response is uncertain.

## Sites / Cloudflare deployment

The existing Site identity remains in `.openai/hosting.json`. Its `DB` binding is provisioned by Sites. Storage is selected at build time:

- Native Next.js: `lib/registration-store.node.js`, using `node:sqlite`.
- Sites / Vite: `lib/registration-store.d1.js`, using Cloudflare D1 and Drizzle.

The Worker bundle does not import the filesystem SQLite adapter. Native Next does not import `cloudflare:workers`.

```sh
npm run dev:sites
npm run build:sites
npm run start:sites
```

For the Sites plugin's required `build-site.mjs` helper, set `ROVX_BUILD_TARGET=sites` in that command's environment. It invokes `npm run build`, which selects the Sites build for that explicit target. Without the variable, `npm run build` builds native Next.js. Use the Sites source workflow and native deployment tools to publish; building alone does not publish.

## Schema migrations

Schema source is `db/schema.js`. Generate a new migration after changing it:

```sh
npm run db:generate
npm run db:migrate:local
```

The local Node migration runner records checksums and skips applied migrations. Do not change previously applied SQL or Drizzle metadata. Sites applies tracked D1 migrations during deployment.

For the separate local Worker preview database, build the Sites target once, then apply each new migration in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_striped_mockingbird.sql
```

Replace the SQL filename with the pending migration. Do not replay migrations already applied to that local Worker database. Native Next SQLite, local Worker D1, and hosted D1 are separate databases.
