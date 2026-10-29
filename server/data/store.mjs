import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined }) : null;
const progressMemory = new Map();
const subscriptionsMemory = new Map();
const childProfilesMemory = new Map();
const paymentEventsMemory = new Set();
const tutorRequestUsageMemory = new Map();
const currentAffairsSourcesMemory = new Map();
const currentAffairsArticlesMemory = new Map();
const competitiveQuestionsMemory = new Map();
const competitiveAttemptsMemory = [];
const currentAffairsBookmarksMemory = new Set();
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
  const key = `${userId}:${lessonId}`;
  const previous = progressMemory.get(key);
  progressMemory.set(key, { lessonId, positionSeconds, completed: Boolean(previous?.completed || completed), updatedAt: new Date().toISOString() });
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

export async function consumeTutorRequest(userId, feature, dailyLimit) {
  const usageDate = new Date().toISOString().slice(0, 10);
  if (pool) {
    const result = await pool.query(`INSERT INTO tutor_request_usage (user_id, usage_date, feature, requests)
      VALUES ($1, $2, $3, 1) ON CONFLICT (user_id, usage_date, feature) DO UPDATE
      SET requests = tutor_request_usage.requests + 1
      WHERE tutor_request_usage.requests < $4
      RETURNING requests`, [userId, usageDate, feature, dailyLimit]);
    return result.rowCount === 1;
  }
  const key = `${userId}:${usageDate}:${feature}`;
  const requests = tutorRequestUsageMemory.get(key) ?? 0;
  if (requests >= dailyLimit) return false;
  tutorRequestUsageMemory.set(key, requests + 1);
  return true;
}

export async function listCurrentAffairsSources({ activeOnly = false } = {}) {
  if (pool) {
    const { rows } = await pool.query(`SELECT id, name, feed_url AS "feedUrl", language, active,
      last_fetched_at AS "lastFetchedAt", last_error AS "lastError"
      FROM current_affairs_sources ${activeOnly ? "WHERE active = true" : ""} ORDER BY name`);
    return rows;
  }
  return [...currentAffairsSourcesMemory.values()]
    .filter((source) => !activeOnly || source.active)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function saveCurrentAffairsSource(source) {
  if (pool) {
    await pool.query(`INSERT INTO current_affairs_sources (id, name, feed_url, language, active)
      VALUES ($1, $2, $3, $4, $5) ON CONFLICT (feed_url) DO UPDATE SET
      name = EXCLUDED.name, language = EXCLUDED.language, active = EXCLUDED.active`,
    [source.id, source.name, source.feedUrl, source.language, source.active]);
    const { rows } = await pool.query(`SELECT id, name, feed_url AS "feedUrl", language, active,
      last_fetched_at AS "lastFetchedAt", last_error AS "lastError"
      FROM current_affairs_sources WHERE feed_url = $1`, [source.feedUrl]);
    return rows[0];
  }
  const existing = [...currentAffairsSourcesMemory.values()].find((item) => item.feedUrl === source.feedUrl);
  const saved = { ...existing, ...source, id: existing?.id ?? source.id, lastFetchedAt: existing?.lastFetchedAt, lastError: existing?.lastError };
  currentAffairsSourcesMemory.set(saved.id, saved);
  return saved;
}

export async function setCurrentAffairsSourceStatus(sourceId, { lastError = null } = {}) {
  if (pool) {
    await pool.query("UPDATE current_affairs_sources SET last_fetched_at = now(), last_error = $2 WHERE id = $1", [sourceId, lastError]);
    return;
  }
  const source = currentAffairsSourcesMemory.get(sourceId);
  if (source) currentAffairsSourcesMemory.set(sourceId, { ...source, lastFetchedAt: new Date().toISOString(), lastError });
}

export async function saveCurrentAffairsArticle(article) {
  if (pool) {
    const result = await pool.query(`INSERT INTO current_affairs_articles
      (id, source_id, title, summary, url, category, language, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (url) DO NOTHING`,
    [article.id, article.sourceId, article.title, article.summary, article.url, article.category, article.language, article.publishedAt]);
    return result.rowCount === 1;
  }
  if ([...currentAffairsArticlesMemory.values()].some((item) => item.url === article.url)) return false;
  currentAffairsArticlesMemory.set(article.id, { ...article, status: "pending", ingestedAt: new Date().toISOString() });
  return true;
}

function mapCurrentAffairsArticle(row) {
  return {
    id: row.id,
    sourceId: row.source_id ?? row.sourceId,
    sourceName: row.source_name ?? row.sourceName,
    title: row.title,
    summary: row.summary,
    url: row.url,
    category: row.category,
    language: row.language,
    publishedAt: row.published_at ?? row.publishedAt,
    status: row.status,
    ingestedAt: row.ingested_at ?? row.ingestedAt,
  };
}

export async function listCurrentAffairsArticles({ status = "approved", category, language, limit = 50 } = {}) {
  if (pool) {
    const values = [status, limit];
    let conditions = "a.status = $1";
    if (status === "approved") conditions += " AND a.published_at <= now()";
    if (category) {
      values.push(category);
      conditions += ` AND a.category = $${values.length}`;
    }
    if (language) {
      values.push(language);
      conditions += ` AND a.language = $${values.length}`;
    }
    const { rows } = await pool.query(`SELECT a.*, s.name AS source_name
      FROM current_affairs_articles a JOIN current_affairs_sources s ON s.id = a.source_id
      WHERE ${conditions} ORDER BY a.published_at DESC LIMIT $2`, values);
    return rows.map(mapCurrentAffairsArticle);
  }
  return [...currentAffairsArticlesMemory.values()]
    .filter((item) => item.status === status && (status !== "approved" || Date.parse(item.publishedAt) <= Date.now()))
    .filter((item) => !category || item.category === category)
    .filter((item) => !language || item.language === language)
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .slice(0, limit)
    .map((item) => ({ ...item, sourceName: currentAffairsSourcesMemory.get(item.sourceId)?.name ?? "Unknown source" }));
}

export async function reviewCurrentAffairsArticle(articleId, status, reviewedBy) {
  if (pool) {
    const { rows } = await pool.query(`UPDATE current_affairs_articles SET status = $2,
      reviewed_at = now(), reviewed_by = $3 WHERE id = $1
      RETURNING id, source_id AS "sourceId", title, summary, url, category, language,
      published_at AS "publishedAt", status`, [articleId, status, reviewedBy]);
    return rows[0];
  }
  const article = currentAffairsArticlesMemory.get(articleId);
  if (!article) return undefined;
  const updated = { ...article, status, reviewedAt: new Date().toISOString(), reviewedBy };
  currentAffairsArticlesMemory.set(articleId, updated);
  return updated;
}

export async function saveCompetitiveQuestion(question) {
  if (pool) {
    await pool.query(`INSERT INTO competitive_questions
      (id, exam, subject, topic, language, prompt, options, correct_answer, explanation, negative_marks, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
    [question.id, question.exam, question.subject, question.topic, question.language,
      question.prompt, JSON.stringify(question.options), question.correctAnswer, question.explanation, question.negativeMarks]);
    return;
  }
  competitiveQuestionsMemory.set(question.id, { ...question, status: "pending", createdAt: new Date().toISOString() });
}

export async function listCompetitiveQuestions({ status = "approved", exam, subject, includeAnswers = false } = {}) {
  if (pool) {
    const values = [status];
    let conditions = "status = $1";
    if (exam) {
      values.push(exam);
      conditions += ` AND exam = $${values.length}`;
    }
    if (subject) {
      values.push(subject);
      conditions += ` AND subject = $${values.length}`;
    }
    const { rows } = await pool.query(`SELECT id, exam, subject, topic, language, prompt, options,
      ${includeAnswers ? "correct_answer AS \"correctAnswer\", explanation," : ""}
      negative_marks AS "negativeMarks", status
      FROM competitive_questions WHERE ${conditions} ORDER BY created_at DESC LIMIT 100`, values);
    return rows;
  }
  return [...competitiveQuestionsMemory.values()]
    .filter((question) => question.status === status && (!exam || question.exam === exam) && (!subject || question.subject === subject))
    .slice(0, 100)
    .map((question) => {
      const { correctAnswer, explanation, ...publicFields } = question;
      return includeAnswers ? { ...publicFields, correctAnswer, explanation } : publicFields;
    });
}

export async function reviewCompetitiveQuestion(questionId, status, reviewedBy) {
  if (pool) {
    const { rows } = await pool.query(`UPDATE competitive_questions SET status = $2,
      reviewed_at = now(), reviewed_by = $3 WHERE id = $1
      RETURNING id, exam, subject, topic, language, prompt, options,
      negative_marks AS "negativeMarks", status`, [questionId, status, reviewedBy]);
    return rows[0];
  }
  const question = competitiveQuestionsMemory.get(questionId);
  if (!question) return undefined;
  const updated = { ...question, status, reviewedAt: new Date().toISOString(), reviewedBy };
  competitiveQuestionsMemory.set(questionId, updated);
  return updated;
}

export async function saveCompetitiveAttempt(attempt) {
  if (pool) {
    await pool.query(`INSERT INTO competitive_attempts
      (id, user_id, exam, question_count, correct_count, wrong_count, score, answers)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [attempt.id, attempt.userId, attempt.exam, attempt.questionCount, attempt.correctCount,
      attempt.wrongCount, attempt.score, JSON.stringify(attempt.answers)]);
    return;
  }
  competitiveAttemptsMemory.push({ ...attempt, createdAt: new Date().toISOString() });
}

export async function listCompetitiveAttempts(userId, limit = 25) {
  if (pool) {
    const { rows } = await pool.query(`SELECT id, exam, question_count AS "questionCount",
      correct_count AS "correctCount", wrong_count AS "wrongCount", score, answers,
      created_at AS "createdAt" FROM competitive_attempts
      WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, limit]);
    return rows;
  }
  return competitiveAttemptsMemory.filter((attempt) => attempt.userId === userId).slice(-limit).reverse();
}

export async function listCurrentAffairsBookmarks(userId) {
  if (pool) {
    const { rows } = await pool.query(`SELECT a.*, s.name AS source_name
      FROM current_affairs_bookmarks b JOIN current_affairs_articles a ON a.id = b.article_id
      JOIN current_affairs_sources s ON s.id = a.source_id
      WHERE b.user_id = $1 AND a.status = 'approved' ORDER BY b.created_at DESC`, [userId]);
    return rows.map(mapCurrentAffairsArticle);
  }
  const ids = [...currentAffairsBookmarksMemory].filter((key) => key.startsWith(`${userId}:`)).map((key) => key.slice(userId.length + 1));
  return ids.map((id) => currentAffairsArticlesMemory.get(id)).filter((article) => article?.status === "approved")
    .map((article) => ({ ...article, sourceName: currentAffairsSourcesMemory.get(article.sourceId)?.name ?? "Unknown source" }));
}

export async function saveCurrentAffairsBookmark(userId, articleId, saved) {
  if (pool) {
    if (saved) {
      const result = await pool.query(`INSERT INTO current_affairs_bookmarks (user_id, article_id)
        SELECT $1, id FROM current_affairs_articles WHERE id = $2 AND status = 'approved'
        ON CONFLICT DO NOTHING`, [userId, articleId]);
      return result.rowCount > 0;
    }
    await pool.query("DELETE FROM current_affairs_bookmarks WHERE user_id = $1 AND article_id = $2", [userId, articleId]);
    return true;
  }
  const article = currentAffairsArticlesMemory.get(articleId);
  if (saved && article?.status !== "approved") return false;
  const key = `${userId}:${articleId}`;
  if (saved) currentAffairsBookmarksMemory.add(key);
  else currentAffairsBookmarksMemory.delete(key);
  return true;
}

export async function closeStore() {
  await pool?.end();
}
