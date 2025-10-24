ALTER TABLE "periods" ALTER COLUMN "total_hours" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "periods" ADD COLUMN "expected_hours" numeric(6, 2) DEFAULT '0' NOT NULL;