CREATE TYPE "public"."card_type" AS ENUM('pokemon', 'trainer', 'energy');--> statement-breakpoint
CREATE TABLE "set" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo" text,
	"release_date" date NOT NULL,
	"legal" jsonb NOT NULL,
	"serie" text NOT NULL,
	"symbol" text,
	"abbreviation" text
);
