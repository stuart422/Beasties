-- Event documents: one itinerary or supporting document per event.
-- Either a private file (PDF or Word .docx, in the same private storage as the photos)
-- or a link to a Google Docs / Microsoft Word document. Only signed-in members can open it;
-- only the owner and admins can add, replace or remove it (checked in server/documents.js).
CREATE TABLE event_documents (
  event_id    TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('pdf', 'docx', 'link')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  file_key    TEXT,          -- storage key, e.g. docs/fall-2026-ab12cd.pdf (files only)
  file_name   TEXT,          -- the original file name, used when downloading
  file_size   INTEGER,
  url         TEXT,          -- links only
  note        TEXT NOT NULL DEFAULT '', -- e.g. "The print-on-open setting was removed."
  updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
