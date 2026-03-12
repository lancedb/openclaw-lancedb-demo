import crypto from "node:crypto";
import * as lancedb from "@lancedb/lancedb";

const TABLE_NAME = "memories";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_EMBED_MODEL = "text-embedding-3-small";
const DEFAULT_OPENAI_EMBED_TIMEOUT_MS = 15000;

function sqlString(value) {
  return String(value).replace(/'/g, "''");
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getEmbedConfig() {
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

function isNumberArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "number");
}

async function embed(text) {
  const { apiKey, baseUrl, model, timeoutMs } = getEmbedConfig();
  let response;
  try {
    response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
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

  const data = await response.json();
  if (!Array.isArray(data?.data)) {
    throw new Error(`OpenAI embeddings response missing "data" array for model "${model}".`);
  }

  const embedding = data.data?.[0]?.embedding;
  if (!isNumberArray(embedding)) {
    throw new Error(`OpenAI embeddings response missing numeric embedding for model "${model}".`);
  }

  return embedding;
}

export async function openMemoryStore({ dbPath = "demo-memory-lancedb", tableName = TABLE_NAME } = {}) {
  const db = await lancedb.connect(dbPath);

  let table;
  try {
    table = await db.openTable(tableName);
  } catch {
    const seedEmbedding = await embed("seed row");
    table = await db.createTable(
      tableName,
      [
        {
          id: "seed",
          user_id: "seed",
          session_id: "seed",
          kind: "seed",
          text: "seed row",
          importance: 0,
          created_at: new Date(0).toISOString(),
          embedding: seedEmbedding,
        },
      ],
      { mode: "overwrite" },
    );
  }

  return {
    async remember({ userId, sessionId, kind = "fact", text, importance = 0.7 }) {
      const row = {
        id: crypto.randomUUID(),
        user_id: userId,
        session_id: sessionId,
        kind,
        text,
        importance,
        created_at: new Date().toISOString(),
        embedding: await embed(text),
      };
      await table.add([row]);
      return row;
    },

    async recall({ userId, query, k = 5, minImportance = 0.5 }) {
      const safeUser = sqlString(userId);
      const threshold = Number(minImportance).toFixed(2);
      const where = `(user_id = '${safeUser}') AND (kind != 'seed') AND (importance >= ${threshold})`;
      const queryVector = await embed(query);

      return table.search(queryVector).where(where).limit(k).toArray();
    },

    async list({ userId, limit = 50 }) {
      const safeUser = sqlString(userId);
      return table
        .query()
        .where(`(user_id = '${safeUser}') AND (kind != 'seed')`)
        .limit(limit)
        .toArray();
    },
  };
}
