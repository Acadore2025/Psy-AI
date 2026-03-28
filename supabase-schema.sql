-- PSYAI PLATFORM — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  name        TEXT,
  age         INTEGER,
  country     TEXT CHECK (country IN ('INDIA','USA')),
  persona     TEXT CHECK (persona IN ('school','college','professional','general')),
  age_version TEXT CHECK (age_version IN ('A','B','C')),
  job_title   TEXT,
  domain      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON profiles USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  country       TEXT NOT NULL,
  status        TEXT DEFAULT 'in_progress',
  question_ids  TEXT[] NOT NULL,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own" ON sessions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE responses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL,
  dimension     TEXT NOT NULL,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer        TEXT NOT NULL,
  timing_ms     INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "responses_own" ON responses USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE answered_questions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  country     TEXT NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);
ALTER TABLE answered_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answered_own" ON answered_questions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_answered_user ON answered_questions(user_id, country);

CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  report_json  JSONB NOT NULL,
  accuracy_conf TEXT,
  headline     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_own" ON reports USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-reset answered questions after 420 (6 full retakes)
CREATE OR REPLACE FUNCTION check_reset_questions() RETURNS TRIGGER AS $$
DECLARE total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM answered_questions WHERE user_id = NEW.user_id AND country = NEW.country;
  IF total >= 420 THEN
    DELETE FROM answered_questions WHERE user_id = NEW.user_id AND country = NEW.country;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_question_answered
  AFTER INSERT ON answered_questions
  FOR EACH ROW EXECUTE FUNCTION check_reset_questions();
