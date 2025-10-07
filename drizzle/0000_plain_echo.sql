CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"surname" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"work_date" date NOT NULL,
	"from_time" time NOT NULL,
	"to_time" time NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hours" ADD CONSTRAINT "hours_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;