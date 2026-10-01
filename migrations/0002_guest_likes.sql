CREATE TABLE IF NOT EXISTS likes (module_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(module_id,user_id));
