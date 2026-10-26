-- Beasties: first schema (Postgres).

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower ON users (lower(email));

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

-- Failed sign-in counts, kept in the database so the limit works across serverless instances.
CREATE TABLE login_attempts (
  key        TEXT PRIMARY KEY,
  count      INTEGER NOT NULL,
  until      TIMESTAMPTZ NOT NULL
);

CREATE TABLE events (
  id         TEXT PRIMARY KEY,          -- slug, also the photo folder name
  name       TEXT NOT NULL,             -- album name, exact from the handoff
  sort       INTEGER NOT NULL,          -- newest first
  event_name TEXT,
  dates      TEXT,
  place      TEXT,
  start_date TEXT,
  upcoming   BOOLEAN NOT NULL DEFAULT false,
  empty_note TEXT,
  days       JSONB NOT NULL DEFAULT '[]',
  caption    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE photos (
  id              SERIAL PRIMARY KEY,
  event_id        TEXT NOT NULL REFERENCES events(id),
  file            TEXT NOT NULL,        -- storage key of the large copy, e.g. fall-2026/01-n013.jpg
  thumb           TEXT NOT NULL,        -- storage key of the thumbnail
  width           INTEGER NOT NULL,
  height          INTEGER NOT NULL,
  day             TEXT NOT NULL DEFAULT 'Day not set',
  caption         TEXT NOT NULL DEFAULT '',
  uploader_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  source          TEXT,
  comments_closed BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX photos_event ON photos (event_id);
CREATE INDEX photos_uploader ON photos (uploader_id);

CREATE TABLE caption_history (
  id          SERIAL PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('photo', 'album')),
  target_id   TEXT NOT NULL,
  old_text    TEXT NOT NULL,
  new_text    TEXT NOT NULL,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX caption_history_target ON caption_history (target_type, target_id);

CREATE TABLE comments (
  id         SERIAL PRIMARY KEY,
  photo_id   INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_photo ON comments (photo_id);
