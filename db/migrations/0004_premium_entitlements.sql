-- Premium entitlements (provider-agnostic)
CREATE TABLE IF NOT EXISTS "premium_entitlements" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id" TEXT NOT NULL,
  "purchase_source" TEXT NOT NULL CHECK ("purchase_source" IN ('web','ios_iap','android_iap')),
  "plan" TEXT NOT NULL,
  "expires_at" INTEGER NOT NULL,
  "provider_ref" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE NO ACTION ON DELETE CASCADE
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "premium_entitlements_user_id_idx" ON "premium_entitlements" ("user_id");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "premium_entitlements_expires_at_idx" ON "premium_entitlements" ("expires_at");

--> statement-breakpoint

-- Audit trail for provider verification events
CREATE TABLE IF NOT EXISTS "premium_purchase_events" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id" TEXT NOT NULL,
  "purchase_source" TEXT NOT NULL CHECK ("purchase_source" IN ('web','ios_iap','android_iap')),
  "plan" TEXT NOT NULL,
  "expires_at" INTEGER NOT NULL,
  "provider_transaction_id" TEXT,
  "raw_receipt" TEXT,
  "created_at" INTEGER NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE NO ACTION ON DELETE CASCADE
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "premium_purchase_events_user_id_idx" ON "premium_purchase_events" ("user_id");

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "premium_purchase_events_created_at_idx" ON "premium_purchase_events" ("created_at");
