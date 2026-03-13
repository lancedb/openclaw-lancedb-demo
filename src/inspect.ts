import { openMemoryStore } from "./memory.ts";

async function run() {
  const store = await openMemoryStore();
  const rows = await store.list({ scopeFilter: ["global", "agent:main"], limit: 100 });

  console.log(`Stored memories: ${rows.length}`);
  for (const row of rows) {
    const ts = Number(row.timestamp || 0);
    const date = Number.isFinite(ts) && ts > 0 ? new Date(ts).toISOString() : "unknown-time";
    console.log(`- ${date} [${row.category}:${row.scope}] ${row.text}`);
  }
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
