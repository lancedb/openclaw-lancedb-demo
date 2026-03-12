import { runSession1 } from "./session1.js";
import { runSession2 } from "./session2.js";

async function run() {
  console.log("=== Dungeon Buddy Memory Demo ===");
  await runSession1();

  console.log("\n--- new session starts (fresh process) ---\n");
  await runSession2();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
