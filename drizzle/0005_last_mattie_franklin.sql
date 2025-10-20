ALTER TABLE "hours" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "hours" CASCADE;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "settings_id" integer;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_settings_id_settings_id_fk" FOREIGN KEY ("settings_id") REFERENCES "public"."settings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "employees_settings_idx" ON "employees" USING btree ("settings_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_is_default_true_uk" ON "settings" USING btree ("id") WHERE is_default = true;