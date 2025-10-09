ALTER TABLE "employees" ADD COLUMN "user_id" uuid;--> statement-breakpoint
CREATE INDEX "employees_user_idx" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hours_employee_idx" ON "hours" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "hours_employee_date_idx" ON "hours" USING btree ("employee_id","work_date");--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_uk" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "hours" ADD CONSTRAINT "hours_emp_date_from_to_uk" UNIQUE("employee_id","work_date","from_time","to_time");