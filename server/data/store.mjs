import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined }) : null;
const progressMemory = new Map();
const subscriptionsMemory = new Map();
const childProfilesMemory = new Map();
const paymentEventsMemory = new Set();
const storeMode = pool ? "postgres" : "memory";

export async function initializeStore() {
  if (!pool) return storeMode;
  const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  await pool.query(schema);
  return storeMode;
}

export function getStoreMode() {
  return storeMode;
}

export async function saveProgress(userId, lessonId, positionSeconds, completed = false) {
  if (pool) {
    await pool.query(`INSERT INTO lesson_progress (user_id, lesson_id, position_seconds, completed)
      VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, lesson_id) DO UPDATE SET
      position_seconds = EXCLUDED.position_seconds, completed = lesson_progress.completed OR EXCLUDED.completed, updated_at = now()`,
    [userId, lessonId, positionSeconds, completed]);
    return;
  }
  progressMemory.set(`${userId}:${lessonId}`, { lessonId, positionSeconds, completed, updatedAt: new Date().toISOString() });
}

export async function getProgress(userId) {
  if (pool) {
    const { rows } = await pool.query("SELECT lesson_id AS \"lessonId\", position_seconds AS \"positionSeconds\", completed, updated_at AS \"updatedAt\" FROM lesson_progress WHERE user_id = $1 ORDER BY updated_at DESC", [userId]);
    return rows;
  }
  return [...progressMemory.entries()].filter(([key]) => key.startsWith(`${userId}:`)).map(([, value]) => value);
}

export async function getSubscription(userId) {
  if (pool) {
    const { rows } = await pool.query("SELECT plan_id AS \"planId\", status, current_period_end AS \"currentPeriodEnd\" FROM subscriptions WHERE user_id = $1", [userId]);
    return rows[0] ?? { planId: "free", status: "free" };
  }
  return subscriptionsMemory.get(userId) ?? { planId: "free", status: "free" };
}

export async function saveSubscription(userId, subscription) {
  if (pool) {
    await pool.query(`INSERT INTO subscriptions (user_id, plan_id, status, provider_subscription_id, current_period_end)
      VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id) DO UPDATE SET plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status, provider_subscription_id = EXCLUDED.provider_subscription_id,
      current_period_end = EXCLUDED.current_period_end, updated_at = now()`,
    [userId, subscription.planId, subscription.status, subscription.providerSubscriptionId ?? null, subscription.currentPeriodEnd ?? null]);
    return;
  }
  subscriptionsMemory.set(userId, subscription);
}

export async function saveChildProfile(profile) {
  if (pool) {
    await pool.query(`INSERT INTO child_profiles (id, parent_id, nickname, class_level, board, language, voice_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname,
      class_level = EXCLUDED.class_level, board = EXCLUDED.board, language = EXCLUDED.language, voice_id = EXCLUDED.voice_id`,
    [profile.id, profile.parentId, profile.nickname, profile.classLevel, profile.board, profile.language, profile.voiceId]);
    return;
  }
  childProfilesMemory.set(profile.id, { ...profile, createdAt: new Date().toISOString() });
}

export async function listChildProfiles(parentId) {
  if (pool) {
    const { rows } = await pool.query(`SELECT id, nickname, class_level AS \"classLevel\", board, language, voice_id AS \"voiceId\"
      FROM child_profiles WHERE parent_id = $1 AND deleted_at IS NULL ORDER BY created_at`, [parentId]);
    return rows;
  }
  return [...childProfilesMemory.values()].filter((profile) => profile.parentId === parentId);
}

export async function softDeleteChildProfile(parentId, childId) {
  if (pool) {
    await pool.query("UPDATE child_profiles SET deleted_at = now() WHERE id = $1 AND parent_id = $2", [childId, parentId]);
    await pool.query("DELETE FROM lesson_progress WHERE user_id = $1", [childId]);
    return;
  }
  childProfilesMemory.delete(childId);
  for (const key of progressMemory.keys()) if (key.startsWith(`${childId}:`)) progressMemory.delete(key);
}

export async function recordPaymentEvent(eventId, eventType) {
  if (pool) {
    const result = await pool.query("INSERT INTO payment_events (event_id, event_type) VALUES ($1, $2) ON CONFLICT DO NOTHING", [eventId, eventType]);
    return result.rowCount === 1;
  }
  if (paymentEventsMemory.has(eventId)) return false;
  paymentEventsMemory.add(eventId);
  return true;
}

export async function closeStore() {
  await pool?.end();
}
