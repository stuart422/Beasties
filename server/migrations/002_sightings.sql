-- Random Beastie Sightings: a gallery of its own, separate from the event albums.

CREATE TABLE sightings (
  id          SERIAL PRIMARY KEY,
  file        TEXT NOT NULL,        -- storage key of the large copy, e.g. sightings/....jpg
  thumb       TEXT NOT NULL,        -- storage key of the thumbnail
  width       INTEGER NOT NULL,
  height      INTEGER NOT NULL,
  place       TEXT NOT NULL DEFAULT '',
  caption     TEXT NOT NULL DEFAULT '',
  uploader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sightings_uploader ON sightings (uploader_id);

-- Sighting captions get the same edit history and Undo as photo and album captions.
ALTER TABLE caption_history DROP CONSTRAINT caption_history_target_type_check;
ALTER TABLE caption_history ADD CONSTRAINT caption_history_target_type_check
  CHECK (target_type IN ('photo', 'album', 'sighting'));
