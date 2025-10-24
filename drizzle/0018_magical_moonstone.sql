CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "customer_id" integer;--> statement-breakpoint
CREATE INDEX "customers_created_by_idx" ON "customers" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;