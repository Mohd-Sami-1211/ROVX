import { fileURLToPath } from "node:url";

const target = process.env.ROVX_BUILD_TARGET || "next";
if (!["next", "sites"].includes(target)) throw new Error("ROVX_BUILD_TARGET must be next or sites.");
const cli = new URL(target === "sites" ? "./run-framework.mjs" : "../node_modules/next/dist/bin/next", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), "build", ...(target === "next" ? ["--webpack"] : [])];
await import(cli.href);
