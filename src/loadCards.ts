import { config } from "dotenv";

import { MikroORM } from "@mikro-orm/postgresql";
import TCGdex, { CardResumeModel, Query, SetModel } from "@tcgdex/sdk";

import { CardCategoryEnum, Cards } from "./db/entities/Cards.js";
import { CardSet } from "./db/entities/CardSet.js";
import { fixAbbreviation } from "./data/conversions.js";

config();

const client = await MikroORM.init();
const em = client.em;

const generator = client.getSchemaGenerator();
await generator.updateSchema();

const tcgdex = new TCGdex("en");
const tcgDexDe = new TCGdex("de");

const releaseDateScarletViolet = new Date("2023-03-01");
const earliestLegalSetReleaseDate = releaseDateScarletViolet;
const setRes = await tcgdex.set.list();

console.log(`Found ${setRes.length} sets from TCGdex API.`);

let sets = (
  await Promise.all(
    setRes.map(async (token) => {
      const set: SetModel & {
        abbreviation?: { official?: string };
      } = await token.getSet();

      fixAbbreviation(set);

      const legal = {
        standard: new Date(set.releaseDate) >= earliestLegalSetReleaseDate,
        expanded: set.legal.expanded,
      };

      return {
        id: set.id,
        legal: legal,
        logo: set.logo,
        name: set.name,
        releaseDate: set.releaseDate,
        serie: set.serie,
        symbol: set.symbol,
        abbreviation: set.abbreviation ? set.abbreviation : null,
        totalCount: set.cardCount.total,
      };
    })
  ).catch((error) => {
    console.error("Error fetching sets from TCGdex API:", error);
    return [];
  })
).filter((set) => set?.serie.name !== "Pokémon TCG Pocket"); // Remove Pocket TCG sets

if (sets.length === 0) {
  throw new Error("No sets found from TCGdex API.");
}

await Promise.all(
  sets.map(async (set) => {
    if (!set) {
      console.warn("Set is undefined or null, skipping.");
      return;
    }

    console.log(`Inserting set: ${set.name} (${set.id})`);
    // Insert all sets
    const result = await em.insert(CardSet, {
      id: set.id,
      name: set.name,
      logo: set.logo,
      releaseDate: set.releaseDate,
      legal: set.legal,
      serie: set.serie.name,
      symbol: set.symbol,
      abbreviation: set.abbreviation?.official ?? null, // Handle optional abbreviation
    });
  })
);

em.flush()
  .then(() => {
    console.log("All sets inserted successfully.");
  })
  .catch((error) => {
    console.error("Error inserting sets:", error);
  });

// Sets before Scarlet & Violet are not required anymore
sets = sets.filter((set) => {
  if (set && set.releaseDate) {
    const releaseDate = new Date(set.releaseDate);
    return releaseDate >= releaseDateScarletViolet;
  }
  return false;
});

for (const set of sets) {
  if (!set) {
    console.warn("Set is undefined or null, skipping.");
    continue;
  }
  const currentSet = set.name;

  console.log(`Processing set: ${set.name} (${set.id})`);
  const totalCards = set.totalCount;
  console.log(`Total cards in set: ${totalCards}`);

  const abbrvId = set.abbreviation?.official || null;

  let cards: CardResumeModel[] = [];
  try {
    cards = await tcgdex.card.list(Query.create().equal("set.id", set.id));
  } catch (error) {
    console.error(`Error fetching cards for set ${set.name} (${set.id}):`);
  }

  console.log(`Found ${cards.length} cards in set: ${currentSet} (${set.id})`);

  let processedCards = 0;
  await Promise.all(
    cards.map(async (card) => {
      try {
        const cardData = await card.getCard();

        // get german card data
        const cardDataDe = await tcgDexDe.card.get(card.id);

        if (!cardDataDe) {
          console.warn(`German card data not found for card ID: ${card.id}`);
          return;
        }

        processedCards++;

        if (!cardData) {
          console.warn(`Card data is undefined for card ID: ${card.id}`);
          return;
        }
        // All of these are currently legal,
        //  TODO handle 2026 rotation
        const legal = {
          standard: true,
          expanded: true,
        };

        // Insert card into database
        //const result = await client(Card).values({
        const a = await em.insert(Cards, {
          id: cardData.id,
          printedId: `${abbrvId}-${cardData.id.split("-")[1]}`,
          name: { en: cardData.name, de: cardDataDe!.name },
          set: set.id,
          rarity: cardData.rarity,
          type: cardData.category.toLowerCase() as CardCategoryEnum,
          legal: legal,
          // @ts-ignore
          apiUpdatedAt: cardData.updated,
          updatedAt: new Date().toISOString(), // Use current time for updatedAt
        });
      } catch (error) {
        console.error(error);
        // Handle error, e.g., log it or retry
      }
    })
  );
}

await client.close();
