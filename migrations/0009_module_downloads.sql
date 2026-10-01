-- Public module totals contain no visitor or configuration associations.
CREATE TABLE module_downloads (module_id TEXT PRIMARY KEY, downloads INTEGER NOT NULL DEFAULT 0 CHECK(downloads>=0));
CREATE TABLE module_download_events (day TEXT NOT NULL, event_hash TEXT NOT NULL, counted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day,event_hash));
CREATE TABLE module_download_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO module_download_meta(key,value) VALUES('collection_started',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
