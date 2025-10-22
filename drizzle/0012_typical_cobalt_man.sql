ALTER TABLE "day_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "day_expectations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "employee_projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "periods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "employee_projects" DROP CONSTRAINT "employee_projects_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "employee_projects" DROP CONSTRAINT "employee_projects_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT "employees_settings_id_settings_id_fk";
--> statement-breakpoint
DROP INDEX "day_entries_emp_date_idx";--> statement-breakpoint
DROP INDEX "day_expectations_emp_idx";--> statement-breakpoint
DROP INDEX "day_expectations_date_idx";--> statement-breakpoint
DROP INDEX "employee_projects_emp_idx";--> statement-breakpoint
DROP INDEX "employee_projects_proj_idx";--> statement-breakpoint
DROP INDEX "employees_user_idx";--> statement-breakpoint
DROP INDEX "employees_start_end_idx";--> statement-breakpoint
DROP INDEX "periods_employee_idx";--> statement-breakpoint
DROP INDEX "periods_week_key_idx";--> statement-breakpoint
DROP INDEX "periods_week_start_idx";--> statement-breakpoint
DROP INDEX "settings_is_default_true_uk";--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_projects" ADD CONSTRAINT "employee_projects_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_projects" ADD CONSTRAINT "employee_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_settings_id_settings_id_fk" FOREIGN KEY ("settings_id") REFERENCES "public"."settings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "day_entries_date_idx" ON "day_entries" USING btree ("work_date");--> statement-breakpoint
CREATE INDEX "day_entries_date_emp_idx" ON "day_entries" USING btree ("work_date","employee_id");--> statement-breakpoint
CREATE INDEX "day_expectations_date_emp_idx" ON "day_expectations" USING btree ("work_date","employee_id");--> statement-breakpoint
CREATE INDEX "employee_projects_proj_emp_idx" ON "employee_projects" USING btree ("project_id","employee_id");--> statement-breakpoint
CREATE INDEX "employees_start_idx" ON "employees" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "employees_end_idx" ON "employees" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "periods_closed_weekstart_idx" ON "periods" USING btree ("closed","week_start_date");--> statement-breakpoint
CREATE INDEX "periods_emp_weekstart_idx" ON "periods" USING btree ("employee_id","week_start_date");--> statement-breakpoint
CREATE INDEX "projects_start_idx" ON "projects" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "projects_end_idx" ON "projects" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "projects_created_by_idx" ON "projects" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_is_default_true_uk" ON "settings" USING btree ("is_default") WHERE "settings"."is_default" = true;--> statement-breakpoint
ALTER TABLE "employee_projects" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "employee_projects" DROP COLUMN "allocation_pct";--> statement-breakpoint
ALTER TABLE "employee_projects" DROP COLUMN "start_date";--> statement-breakpoint
ALTER TABLE "employee_projects" DROP COLUMN "end_date";--> statement-breakpoint
DROP TYPE "public"."day_type";