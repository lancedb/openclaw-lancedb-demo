import { openMemoryStore } from "./memory.js";

async function run() {
  const store = await openMemoryStore();
  const rows = await store.list({ userId: "player-1", limit: 100 });

  console.log(`Stored memories: ${rows.length}`);
  for (const row of rows) {
    console.log(`- ${row.created_at} [${row.kind}] ${row.text}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
