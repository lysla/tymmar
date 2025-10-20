CREATE TABLE "employee_projects" (
	"employee_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"allocation_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_projects_pk" PRIMARY KEY("employee_id","project_id")
);
--> statement-breakpoint
ALTER TABLE "employee_projects" ADD CONSTRAINT "employee_projects_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "employee_projects" ADD CONSTRAINT "employee_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "employee_projects_emp_idx" ON "employee_projects" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_projects_proj_idx" ON "employee_projects" USING btree ("project_id");