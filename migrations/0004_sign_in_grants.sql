CREATE TABLE IF NOT EXISTS sign_in_grants (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 challenge TEXT NOT NULL,
 expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sign_in_grants_expiry ON sign_in_grants(expires);
