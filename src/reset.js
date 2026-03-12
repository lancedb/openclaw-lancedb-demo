import { rm } from "node:fs/promises";

async function run() {
  await rm("demo-memory-lancedb", { recursive: true, force: true });
  console.log("Removed demo-memory-lancedb/");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
