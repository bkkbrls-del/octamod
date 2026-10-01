-- Aggregate site usage is separate from guest identities and configuration contents.
CREATE TABLE usage_daily (
  day TEXT PRIMARY KEY,
  visitors INTEGER NOT NULL DEFAULT 0,
  page_views INTEGER NOT NULL DEFAULT 0,
  configurations INTEGER NOT NULL DEFAULT 0,
  builds INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  exports INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE usage_visitors (day TEXT NOT NULL, visitor_hash TEXT NOT NULL, counted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,visitor_hash));
CREATE TABLE usage_events (day TEXT NOT NULL, event_hash TEXT NOT NULL, counted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,event_hash));
CREATE TABLE usage_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
