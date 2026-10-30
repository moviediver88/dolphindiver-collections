CREATE TABLE IF NOT EXISTS dd_users (
 id UUID PRIMARY KEY, username VARCHAR(32) NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, recovery_hash CHAR(64) NOT NULL,
 feed_hash CHAR(64) NOT NULL UNIQUE, feed_cipher TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dd_sessions (
 token_hash CHAR(64) PRIMARY KEY, user_id UUID NOT NULL REFERENCES dd_users(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dd_sessions_expiry ON dd_sessions(expires_at);
CREATE TABLE IF NOT EXISTS dd_collections (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES dd_users(id) ON DELETE CASCADE,
 name VARCHAR(60) NOT NULL, kind VARCHAR(10) NOT NULL CHECK(kind IN ('all','movie','series')),
 smart BOOLEAN NOT NULL DEFAULT false, position INTEGER NOT NULL,
 UNIQUE(id,user_id)
);
CREATE TABLE IF NOT EXISTS dd_items (
 user_id UUID NOT NULL REFERENCES dd_users(id) ON DELETE CASCADE,
 item_key VARCHAR(40) NOT NULL, imdb_id VARCHAR(20) NOT NULL,
 type VARCHAR(10) NOT NULL CHECK(type IN ('movie','series')),
 name VARCHAR(250) NOT NULL, year VARCHAR(30) NOT NULL DEFAULT '', poster TEXT NOT NULL DEFAULT '',
 added_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(user_id,item_key)
);
CREATE TABLE IF NOT EXISTS dd_memberships (
 user_id UUID NOT NULL, collection_id UUID NOT NULL, item_key VARCHAR(40) NOT NULL,
 added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,collection_id,item_key),
 FOREIGN KEY(collection_id,user_id) REFERENCES dd_collections(id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(user_id,item_key) REFERENCES dd_items(user_id,item_key) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS dd_limits (
 key CHAR(64) PRIMARY KEY, hits INTEGER NOT NULL, expires_at TIMESTAMPTZ NOT NULL
);
