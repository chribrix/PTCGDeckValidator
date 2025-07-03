// connect to db
// load cards from tcgdex
// save cards to db

import TCGdex, { CardResume, Query } from "@tcgdex/sdk";
import { writeFile, writeFileSync } from "fs";
import { serial, text, pgSchema, date, jsonb } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "dotenv";
import { Cards, Sets as Sets, CardTypeEnum } from "./db/schema.js";

config(); // Load environment variables from .env file

const client = drizzle(process.env.DATABASE_URL!);

const tcgdex = new TCGdex("en");

// Manual fix for abbrevations
const fixAbbreviationsMap = {
  SV: "SVI", // TCGdex uses "SV" for Scarlet & Violet, but "SVI" is printed on cards
};

// Query sets from SVI onward
/*
const setRes = await tcgdex.set.list();

const sets = (
  await Promise.all(
    setRes.map(async (token) => {
      const set = await token.getSet();
      // keep following properties: id, legal, logo, name, releaseDate, serie, name, serie, symbol, abbreviation
      if (new Date(set.releaseDate) >= new Date("2023-03-01")) {
        return {
          id: set.id,
          legal: set.legal,
          logo: set.logo,
          name: set.name,
          releaseDate: set.releaseDate,
          serie: set.serie,
          symbol: set.symbol,
          // @ts-ignore TCGdex SDK does not have abbreviation in type
          abbreviation: set.abbreviation ? set.abbreviation : null,
        };
      }

      return;
    })
  )
)
  .filter(Boolean) // remove entries where date is before 2023-03-01 (null entries)
  .filter((set) => set?.serie.name !== "Pokemon TCG Pocket"); // Remove Pocket TCG sets

if (sets.length === 0) {
  console.error("No sets found from SVI onward.");
  process.exit(1);
}

await Promise.all(
  sets.map(async (set) => {
    if (!set) {
      console.warn("Set is undefined, skipping...");
      return;
    }

    // Inseert all sets
    const result = await client
      .insert(Sets)
      .values({
        id: set.id,
        name: set.name,
        logo: set.logo,
        releaseDate: set.releaseDate,
        legal: set.legal,
        serie: set.serie.name,
        symbol: set.symbol,
        abbreviation: set.abbreviation?.official ?? null, // Handle optional abbreviation
      })
      .onConflictDoNothing() // Avoid duplicates
      .returning();
  })
);
// Todo memoize loaded sets and cards, to continue when interrupted
const currentSet = sets[0]?.name;
const set1 = sets[0];
*/
const sv01 = await tcgdex.set.list(Query.create().equal("id", "sv01"));
const sv01set = await sv01[0].getSet();
const cards = sv01set.cards;

// query each card in set
const cardPromises = cards.map(async (card) => {
  //const card = cards[0]; // For testing, just use the first card
  try {
    const cardData = await card.getCard();

    let abbrvId: string | null = null;
    if (typeof sv01set.abbreviation?.official === "string") {
      // Build printed ID (e.g., "TWM-200" for Dragapult ex)
      abbrvId = sv01set.abbreviation.official + "-" + cardData.id.split("-")[1];
    }

    // Insert card into database
    const result = await client
      .insert(Cards)
      .values({
        id: cardData.id,
        printedId: abbrvId,
        name: { en: cardData.name },
        set: sv01set.id,
        rarity: cardData.rarity,
        type: cardData.category.toLocaleLowerCase() as (typeof CardTypeEnum.enumValues)[number],
        legal: cardData.legal,
        apiUpdatedAt: cardData.updated,
        updatedAt: new Date().toISOString(), // Use current time for updatedAt
      })
      .onConflictDoNothing()
      .returning();
  } catch (error) {
    console.error(error);
    // Handle error, e.g., log it or retry
  }
});

// Query cards from the first set
// for each set, query set
// for each card in set, query card, insert card into db
// handle reprints
