import crypto from "node:crypto";
import * as lancedb from "@lancedb/lancedb";

const TABLE_NAME = "memories";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_EMBED_MODEL = "text-embedding-3-small";
const DEFAULT_OPENAI_EMBED_TIMEOUT_MS = 15000;

type MemoryCategory = "preference" | "fact" | "decision" | "entity" | "other" | "reflection";
type SmartMemoryCategory = "profile" | "preferences" | "entities" | "events" | "cases" | "patterns";

type MemoryRow = {
  id: string;
  text: string;
  vector: number[];
  category: MemoryCategory;
  scope: string;
  importance: number;
  timestamp: number;
  metadata: string;
};

type RememberParams = {
  category?: MemoryCategory;
  text: string;
  importance?: number;
  scope?: string;
};

type ListParams = {
  scopeFilter?: string[];
  limit?: number;
};

type EmbedConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
};

type OpenMemoryStoreOptions = {
  dbPath?: string;
  tableName?: string;
};

type MemoryStore = {
  remember(params: RememberParams): Promise<MemoryRow>;
  list(params?: ListParams): Promise<MemoryRow[]>;
  clear(): Promise<number>;
};

const SMART_CATEGORY_MAP: Record<MemoryCategory, SmartMemoryCategory> = {
  preference: "preferences",
  fact: "cases",
  decision: "events",
  entity: "entities",
  other: "patterns",
  reflection: "patterns",
};

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getEmbedConfig(): EmbedConfig {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for embeddings.");
  }

  return {
    apiKey,
    baseUrl: process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL,
    model: process.env.OPENAI_EMBED_MODEL || DEFAULT_OPENAI_EMBED_MODEL,
    timeoutMs: parsePositiveInt(process.env.OPENAI_EMBED_TIMEOUT_MS, DEFAULT_OPENAI_EMBED_TIMEOUT_MS),
  };
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "number");
}

function encodeMetadata(category: MemoryCategory): string {
  return JSON.stringify({ memory_category: SMART_CATEGORY_MAP[category] });
}

async function embed(text: string): Promise<number[]> {
  const { apiKey, baseUrl, model, timeoutMs } = getEmbedConfig();
  let response;

  try {
    response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: text }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error(
        `OpenAI embeddings request timed out after ${timeoutMs}ms (baseURL: ${baseUrl}, model: ${model}).`,
      );
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`OpenAI embeddings request failed before response (baseURL: ${baseUrl}): ${detail}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embeddings request failed (${response.status}): ${body}`);
  }

  const data = await response.json() as { data?: Array<{ embedding?: unknown }> };
  const embedding = data.data?.[0]?.embedding;
  if (!isNumberArray(embedding)) {
    throw new Error(`OpenAI embeddings response missing numeric embedding for model "${model}".`);
  }

  return embedding;
}

async function tryOpenTable(db: any, tableName: string): Promise<any | null> {
  try {
    return await db.openTable(tableName);
  } catch {
    return null;
  }
}

export async function openMemoryStore(
  { dbPath = "demo-memory-lancedb", tableName = TABLE_NAME }: OpenMemoryStoreOptions = {},
): Promise<MemoryStore> {
  const db = await lancedb.connect(dbPath);
  let table: any | null = await tryOpenTable(db, tableName);

  return {
    async remember({
      category = "fact",
      text,
      importance = 0.7,
      scope = "global",
    }: RememberParams): Promise<MemoryRow> {
      const row: MemoryRow = {
        id: crypto.randomUUID(),
        text,
        vector: await embed(text),
        category,
        scope,
        importance,
        timestamp: Date.now(),
        metadata: encodeMetadata(category),
      };

      if (table) {
        await table.add([row]);
        return row;
      }

      try {
        table = await db.createTable(tableName, [row]);
        return row;
      } catch {
        table = await db.openTable(tableName);
        await table.add([row]);
        return row;
      }
    },

    async list({ scopeFilter = ["global", "agent:main"], limit = 50 }: ListParams = {}): Promise<MemoryRow[]> {
      table = table ?? await tryOpenTable(db, tableName);
      if (!table) {
        return [];
      }

      const rows = await table
        .query()
        .select(["id", "text", "category", "scope", "importance", "timestamp", "metadata"])
        .toArray() as MemoryRow[];

      const scopeSet = new Set(scopeFilter);
      return rows
        .filter((row) => scopeFilter.length === 0 || scopeSet.has(row.scope))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    },

    async clear(): Promise<number> {
      table = table ?? await tryOpenTable(db, tableName);
      if (!table) {
        return 0;
      }

      const rows = await table.query().select(["id"]).toArray();
      if (rows.length === 0) {
        return 0;
      }

      await table.delete("id IS NOT NULL");
      return rows.length;
    },
  };
}
