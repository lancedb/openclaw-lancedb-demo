import { openMemoryStore } from "./memory.ts";

async function run() {
  const store = await openMemoryStore();
  const cleared = await store.clear();
  console.log(`Cleared ${cleared} memory row(s) from demo-memory-lancedb/.`);
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
