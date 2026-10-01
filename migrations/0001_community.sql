PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, display_name TEXT NOT NULL,
 github_id TEXT UNIQUE, github_login TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS configurations (
 id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL,
 modules_json TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,id)
);
CREATE TABLE IF NOT EXISTS submissions (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), module_id TEXT NOT NULL, title TEXT NOT NULL,
 repository_url TEXT NOT NULL, description TEXT NOT NULL, usage TEXT NOT NULL, test_report_url TEXT NOT NULL,
 stress_notes TEXT NOT NULL, quality_notes TEXT NOT NULL, resource_notes TEXT NOT NULL, license TEXT NOT NULL, rights_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(rights_confirmed IN (0,1)),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected')),
 review_note TEXT NOT NULL DEFAULT '', reviewer_id TEXT REFERENCES users(id), reviewed_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS submissions_status ON submissions(status,created_at);
CREATE INDEX IF NOT EXISTS submissions_owner ON submissions(owner_id);
CREATE INDEX IF NOT EXISTS submissions_module ON submissions(module_id,status);
CREATE TABLE IF NOT EXISTS media (
 id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE, kind TEXT NOT NULL CHECK(kind IN ('image','audio')),
 mime TEXT NOT NULL, caption TEXT NOT NULL, capture_type TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, bytes INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS media_submission ON media(submission_id);
CREATE TABLE IF NOT EXISTS comments (
 id TEXT PRIMARY KEY, module_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS comments_module ON comments(module_id,created_at);
CREATE TABLE IF NOT EXISTS ratings (
 module_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), value INTEGER NOT NULL CHECK(value BETWEEN 1 AND 5),
 PRIMARY KEY(module_id,user_id)
);

CREATE TABLE IF NOT EXISTS issues (id TEXT PRIMARY KEY,module_id TEXT NOT NULL,author_login TEXT NOT NULL,reporter_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS issues_author ON issues(author_login,status,created_at);
CREATE TABLE IF NOT EXISTS likes (module_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(module_id,user_id));
