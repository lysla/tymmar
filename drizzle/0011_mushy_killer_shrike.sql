CREATE TABLE "day_expectations" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"work_date" date NOT NULL,
	"expected_hours" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "day_expectations_emp_date_uk" UNIQUE("employee_id","work_date")
);
--> statement-breakpoint
ALTER TABLE "day_expectations" ADD CONSTRAINT "day_expectations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "day_expectations_emp_idx" ON "day_expectations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "day_expectations_date_idx" ON "day_expectations" USING btree ("work_date");