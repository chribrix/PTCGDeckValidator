CREATE TABLE "card" (
	"id" text PRIMARY KEY NOT NULL,
	"printed_id" text,
	"name" jsonb NOT NULL,
	"set" text NOT NULL,
	"rarity" text NOT NULL,
	"type" "card_type" NOT NULL,
	"legal" jsonb,
	"pokemon" jsonb,
	"trainer" jsonb,
	"energy" jsonb
);
