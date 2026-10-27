-- Members added by the owner or an admin start with a temporary password and must choose
-- their own at first sign-in.
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Photo order inside each album. Until now albums were shown by id, so sort_order = id
-- keeps every existing photo exactly where it is.
ALTER TABLE photos ADD COLUMN sort_order INTEGER;
UPDATE photos SET sort_order = id;
ALTER TABLE photos ALTER COLUMN sort_order SET NOT NULL;
-- Uploads made by the old code in the minute before the new code is live still land at the end.
ALTER TABLE photos ALTER COLUMN sort_order SET DEFAULT 1000000;
CREATE INDEX photos_event_order ON photos (event_id, sort_order);

-- The arrangement before each move, so "Undo last move" can put an album back.
CREATE TABLE photo_order_history (
  id         SERIAL PRIMARY KEY,
  event_id   TEXT NOT NULL REFERENCES events(id),
  photo_ids  JSONB NOT NULL,          -- photo ids in order, before the move
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX photo_order_history_event ON photo_order_history (event_id, id);
