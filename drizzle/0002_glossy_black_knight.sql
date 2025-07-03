ALTER TABLE "card" ADD COLUMN "api_updated_at" date NOT NULL;--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "updated_at" date DEFAULT now() NOT NULL;