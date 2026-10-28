-- Beasties Assistant: anonymous counters only. No message text or answer is ever stored.

-- Site-wide totals per day ('day:2026-10-28') and per month ('month:2026-10'). The monthly
-- total is what the ASSISTANT_MONTHLY_MESSAGE_CAP is checked against.
CREATE TABLE assistant_usage (
  period   TEXT PRIMARY KEY,
  messages INTEGER NOT NULL DEFAULT 0
);

-- Per-person hourly and daily limits. The key is a one-way hash, so it cannot be traced back
-- to a member, and every row expires (old rows are deleted as new ones are written).
CREATE TABLE assistant_limits (
  key   TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  until TIMESTAMPTZ NOT NULL
);
