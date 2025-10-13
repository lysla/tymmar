CREATE TABLE "periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"week_key" text NOT NULL,
	"week_start_date" date NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp with time zone,
	"total_hours" numeric(6, 2) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "periods_employee_week_uk" UNIQUE("employee_id","week_key")
);
--> statement-breakpoint
ALTER TABLE "periods" ADD CONSTRAINT "periods_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "periods_employee_idx" ON "periods" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "periods_week_key_idx" ON "periods" USING btree ("week_key");--> statement-breakpoint
CREATE INDEX "periods_week_start_idx" ON "periods" USING btree ("week_start_date");