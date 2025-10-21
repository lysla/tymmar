DROP INDEX "projects_active_idx";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "code";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "active";