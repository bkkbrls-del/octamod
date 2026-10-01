-- Octamod has no website sign-in. Remove one-use OAuth grants; administration uses separate, short-lived sessions.
DROP TABLE IF EXISTS sign_in_grants;
CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, key_hash TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS admin_sessions_expiry ON admin_sessions(expires);
-- History rows need an actor; the administrator is not a visitor account and has no guest session.
INSERT OR IGNORE INTO users(id,display_name) VALUES('administrator','Octamod administrator');
