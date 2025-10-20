ALTER TABLE "employees" DROP CONSTRAINT "employees_user_id_unique";--> statement-breakpoint
ALTER TABLE "day_entries" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "day_entries" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "periods" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "periods" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "id" DROP IDENTITY;