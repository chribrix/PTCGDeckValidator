import {
  pgSchema,
  text,
  jsonb,
  date,
  pgEnum,
  pgTable,
} from "drizzle-orm/pg-core";

export const CardTypeEnum = pgEnum("card_type", [
  "pokemon",
  "trainer",
  "energy",
]);

export const Sets = pgTable("set", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  releaseDate: date("release_date").notNull(),
  legal: jsonb("legal")
    .$type<{
      expanded: boolean;
      standard: boolean;
    }>()
    .notNull(),
  serie: text("serie").notNull(),
  symbol: text("symbol"),
  abbreviation: text("abbreviation"),
});

export const Cards = pgTable("card", {
  id: text("id").primaryKey(),
  printedId: text("printed_id"),
  name: jsonb("name")
    .$type<{ en?: string; de?: string; fr?: string; it?: string }>()
    .notNull(),
  set: text("set").notNull(),
  rarity: text("rarity").notNull(),
  type: CardTypeEnum("type").notNull(),

  legal: jsonb("legal").$type<{
    expanded: boolean;
    standard: boolean;
  }>(),

  // Fields for holding additional information related to the card type
  pokemon: jsonb("pokemon"),
  trainer: jsonb("trainer"),
  energy: jsonb("energy"),
  // Last time the card was updated in the API before being inserted into the database
  apiUpdatedAt: date("api_updated_at").notNull(),
  
  // Last time the card was updated in the database
  updatedAt: date("updated_at").notNull().defaultNow(),
  
});
