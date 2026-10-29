CREATE TABLE IF NOT EXISTS child_profiles (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  class_level SMALLINT NOT NULL CHECK (class_level BETWEEN 1 AND 12),
  board TEXT NOT NULL,
  language TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  question_index SMALLINT NOT NULL,
  correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tutor_usage (
  user_id TEXT NOT NULL,
  usage_date DATE NOT NULL,
  feature TEXT NOT NULL,
  seconds INTEGER NOT NULL DEFAULT 0,
  tokens INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date, feature)
);

CREATE TABLE IF NOT EXISTS tutor_request_usage (
  user_id TEXT NOT NULL,
  usage_date DATE NOT NULL,
  feature TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0),
  PRIMARY KEY (user_id, usage_date, feature)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'free',
  provider_subscription_id TEXT UNIQUE,
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS safety_incidents (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  reviewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS current_affairs_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  feed_url TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL CHECK (language IN ('en', 'hi')),
  active BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS current_affairs_articles (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES current_affairs_sources(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'General',
  language TEXT NOT NULL CHECK (language IN ('en', 'hi')),
  published_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);
CREATE INDEX IF NOT EXISTS current_affairs_articles_publication_idx
  ON current_affairs_articles (status, published_at DESC);

CREATE TABLE IF NOT EXISTS competitive_questions (
  id TEXT PRIMARY KEY,
  exam TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'hi')),
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer SMALLINT NOT NULL,
  explanation TEXT NOT NULL,
  negative_marks NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (negative_marks >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 6),
  CHECK (correct_answer >= 0 AND correct_answer < jsonb_array_length(options))
);
CREATE INDEX IF NOT EXISTS competitive_questions_public_idx
  ON competitive_questions (status, exam, subject);

CREATE TABLE IF NOT EXISTS competitive_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exam TEXT NOT NULL,
  question_count SMALLINT NOT NULL,
  correct_count SMALLINT NOT NULL,
  wrong_count SMALLINT NOT NULL,
  score NUMERIC(8, 2) NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS competitive_attempts_user_idx
  ON competitive_attempts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS current_affairs_bookmarks (
  user_id TEXT NOT NULL,
  article_id TEXT NOT NULL REFERENCES current_affairs_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);

CREATE TABLE IF NOT EXISTS study_goals (
  user_id TEXT PRIMARY KEY,
  daily_target_minutes SMALLINT NOT NULL DEFAULT 30 CHECK (daily_target_minutes BETWEEN 5 AND 600),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_plan_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  due_date DATE NOT NULL,
  planned_minutes SMALLINT NOT NULL CHECK (planned_minutes BETWEEN 5 AND 600),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_plan_tasks_user_date_idx
  ON study_plan_tasks (user_id, due_date, created_at);

CREATE TABLE IF NOT EXISTS study_focus_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('focus', 'break')),
  planned_minutes SMALLINT NOT NULL CHECK (planned_minutes BETWEEN 1 AND 120),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  elapsed_seconds INTEGER CHECK (elapsed_seconds IS NULL OR elapsed_seconds BETWEEN 0 AND 7200),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'))
);
CREATE UNIQUE INDEX IF NOT EXISTS study_focus_sessions_one_active_per_user
  ON study_focus_sessions (user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS study_focus_sessions_user_start_idx
  ON study_focus_sessions (user_id, started_at DESC);
