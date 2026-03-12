import { fileURLToPath } from "node:url";
import { openMemoryStore } from "./memory.js";

export async function runSession1() {
  const store = await openMemoryStore();

  const userId = "player-1";
  const sessionId = "session-1";

  const captures = [
    {
      kind: "profile",
      text: "Player class is elf healer who keeps the team alive.",
      importance: 0.95,
    },
    {
      kind: "preference",
      text: "Player hates spiders and avoids spider caves.",
      importance: 0.9,
    },
    {
      kind: "preference",
      text: "Player loves fire spells and explosive battle plans.",
      importance: 0.85,
    },
    {
      kind: "resource",
      text: "Inventory has one phoenix ember and three healing potions.",
      importance: 0.75,
    },
  ];

  console.log("Session 1: capturing long-term memory");
  for (const item of captures) {
    await store.remember({ userId, sessionId, ...item });
    console.log(`- saved: [${item.kind}] ${item.text}`);
  }

  console.log("Session 1 complete. Memory written to demo-memory-lancedb/");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  runSession1().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
