CREATE TABLE "day_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"work_date" date NOT NULL,
	"type" "day_type" NOT NULL,
	"project_id" integer,
	"hours" numeric(5, 2) DEFAULT '0' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "day_entries" ADD CONSTRAINT "day_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_entries" ADD CONSTRAINT "day_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "day_entries_emp_date_idx" ON "day_entries" USING btree ("employee_id","work_date");--> statement-breakpoint
CREATE INDEX "day_entries_emp_proj_idx" ON "day_entries" USING btree ("employee_id","project_id");--> statement-breakpoint
CREATE INDEX "day_entries_proj_date_idx" ON "day_entries" USING btree ("project_id","work_date");--> statement-breakpoint
CREATE INDEX "projects_active_idx" ON "projects" USING btree ("active");--> statement-breakpoint
CREATE INDEX "employees_start_end_idx" ON "employees" USING btree ("start_date","end_date");