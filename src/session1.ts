import { fileURLToPath } from "node:url";
import { openMemoryStore } from "./memory.ts";

export async function runSession1() {
  const store = await openMemoryStore();

  const captures: Array<{ category: "entity" | "preference" | "fact"; text: string; importance: number }> = [
    {
      category: "entity",
      text: "Player class is elf healer who keeps the team alive.",
      importance: 0.95,
    },
    {
      category: "preference",
      text: "Player hates spiders and avoids spider caves.",
      importance: 0.9,
    },
    {
      category: "preference",
      text: "Player loves fire spells and explosive battle plans.",
      importance: 0.85,
    },
    {
      category: "fact",
      text: "Inventory has one phoenix ember and three healing potions.",
      importance: 0.75,
    },
  ];

  console.log("Session 1: seeding plugin-compatible long-term memory");
  for (const item of captures) {
    await store.remember({
      ...item,
      scope: "global",
    });
  }

  console.log("Session 1 complete. Memory written to demo-memory-lancedb/ in memory-lancedb-pro schema.");
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  runSession1().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
