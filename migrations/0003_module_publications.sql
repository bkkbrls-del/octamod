CREATE TABLE IF NOT EXISTS module_publications (
 module_id TEXT PRIMARY KEY,
 submission_id TEXT NOT NULL UNIQUE REFERENCES submissions(id)
);
INSERT OR IGNORE INTO module_publications(module_id,submission_id)
 SELECT s.module_id,s.id FROM submissions s WHERE s.status='approved' AND s.rowid=(
  SELECT newest.rowid FROM submissions newest WHERE newest.module_id=s.module_id AND newest.status='approved'
  ORDER BY newest.reviewed_at DESC,newest.rowid DESC LIMIT 1
 );
CREATE TABLE IF NOT EXISTS review_events (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), module_id TEXT NOT NULL,
 submission_id TEXT NOT NULL REFERENCES submissions(id),
 action TEXT NOT NULL CHECK(action IN ('approved','rejected','withdrawn')),
 note TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS review_events_recent ON review_events(created_at);
