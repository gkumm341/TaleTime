-- Auth: users + sessions (MVP)
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "is_paid" INTEGER NOT NULL DEFAULT 0,
  "created_at" INTEGER NOT NULL
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "expires_at" INTEGER NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE NO ACTION ON DELETE CASCADE
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions" ("user_id");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_sessions_expires_at_idx" ON "user_sessions" ("expires_at");
