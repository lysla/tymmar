CREATE TYPE "public"."day_type" AS ENUM('work', 'sick', 'time_off');--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"mon_hours" numeric(4, 2) DEFAULT '8' NOT NULL,
	"tue_hours" numeric(4, 2) DEFAULT '8' NOT NULL,
	"wed_hours" numeric(4, 2) DEFAULT '8' NOT NULL,
	"thu_hours" numeric(4, 2) DEFAULT '8' NOT NULL,
	"fri_hours" numeric(4, 2) DEFAULT '8' NOT NULL,
	"sat_hours" numeric(4, 2) DEFAULT '0' NOT NULL,
	"sun_hours" numeric(4, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hours" DROP CONSTRAINT "hours_emp_date_from_to_uk";--> statement-breakpoint
ALTER TABLE "hours" ALTER COLUMN "type" SET DEFAULT 'work'::"public"."day_type";--> statement-breakpoint
ALTER TABLE "hours" ALTER COLUMN "type" SET DATA TYPE "public"."day_type" USING "type"::"public"."day_type";--> statement-breakpoint
ALTER TABLE "hours" ADD COLUMN "total_hours" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "hours" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "hours" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "hours" DROP COLUMN "from_time";--> statement-breakpoint
ALTER TABLE "hours" DROP COLUMN "to_time";--> statement-breakpoint
ALTER TABLE "hours" ADD CONSTRAINT "hours_employee_date_uk" UNIQUE("employee_id","work_date");