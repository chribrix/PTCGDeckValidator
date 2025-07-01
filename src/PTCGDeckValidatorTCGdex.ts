import TCGdex, { Query, Card } from "@tcgdex/sdk";
import type { CardResume } from "@tcgdex/sdk";
import { energyNameMap, intlToJapaneseSetMap } from "./data/conversions.js";

import { writeFileSync } from "fs";

export type ValidationResult = {
  isValid: boolean;
  errors?: Array<string>;
};

type CardToken = {
  inDeck: number;
  name: string;
  setId?: number;
  set?: string;
  legal?: { standard: boolean; expanded?: boolean };
  rarity?: string;
};

type DeckSections = {
  pokemonCards: string[];
  trainerCards: string[];
  energyCards: string[];
};

class PTCGDeckValidator {
  protected _tcgDexEn?: TCGdex;
  protected _tcgDexDe?: TCGdex;

  constructor() {
    this._tcgDexDe ?? new TCGdex("de");
    this._tcgDexEn ?? new TCGdex("en");
  }

  get dexDe() {
    return this._tcgDexDe ?? new TCGdex("de");
  }

  get dexEn() {
    return this._tcgDexEn ?? new TCGdex("en");
  }

  parseDeck(deckString: string) {
    const lines = deckString.split(/\r?\n/);

    const pokemonCards: Array<string> = [];
    const trainerCards: Array<string> = [];
    const energyCards: Array<string> = [];
    const errors: Array<string> = [];

    let currentSection: keyof DeckSections | null = null;

    const pokemonPattern = /^\d+ .+ [A-Za-z-]{2,5} \d{1,3}$/;
    const optionalSetPattern = /^\d+ .+(?: [A-Za-z-]{2,5} \d{1,3})?$/;

    const pokemonHeaderPattern = /^Pokémon:(?: \d+)?$/;
    const trainerHeaderPattern = /^Trainer:(?: \d+)?$/;
    const energyHeaderPattern = /^(Energy|Energie)(: \d+)?$/;

    for (const line of lines) {
      if (pokemonHeaderPattern.test(line)) {
        currentSection = "pokemonCards";
        continue;
      }
      if (trainerHeaderPattern.test(line)) {
        currentSection = "trainerCards";
        continue;
      }
      if (energyHeaderPattern.test(line)) {
        currentSection = "energyCards";
        continue;
      }
      if (line.trim() === "") continue;
      if (/^Karten insgesamt: \d+$/.test(line)) continue;

      const isValid =
        currentSection === "pokemonCards"
          ? pokemonPattern.test(line)
          : optionalSetPattern.test(line);

      if (!isValid) {
        errors.push(
          `Invalid format in ${currentSection}. Expected format: ${
            currentSection === "pokemonCards"
              ? "<count> <name> <setId> <setNum>"
              : "<count> <name> [setId setNum]"
          }`
        );
      }

      // Store the valid line
      if (currentSection === "pokemonCards") {
        pokemonCards.push(line);
      } else if (currentSection === "trainerCards") {
        trainerCards.push(line);
      } else if (currentSection === "energyCards") {
        energyCards.push(line);
      }
    }

    const pokemonTokens = pokemonCards.map((card) => this.toCardToken(card));
    const trainerTokens = trainerCards.map((card) => this.toCardToken(card));
    const energyTokens = energyCards.map((card) => this.toCardToken(card));
    return {
      deck: {
        pokemonTokens,
        trainerTokens,
        energyTokens,
      },
      errors,
    };
  }

  async check(decklist: string) {
    let errors: Array<string> = [];
    let isValid = true;
    const { deck, errors: parseErrors } = this.parseDeck(decklist);

    if (parseErrors.length > 1) {
      console.dir(parseErrors, { depth: 10 });
      return { isValid: false, errors: parseErrors };
    }

    const { cards: pokemonCards, errors: pkmnErrors } =
      await this.queryPokemonCards(deck.pokemonTokens);

    if (pkmnErrors.length > 0) {
      errors = errors.concat(pkmnErrors);
      isValid = false;
    }

    const { cards: trainerCards, errors: trainerErrors } =
      await this.queryTrainerCards(deck.trainerTokens);

    if (trainerErrors.length > 0) {
      errors = errors.concat(trainerErrors);
      isValid = false;
    }

    const { cards: energyCards, errors: energyErrors } =
      await this.queryEnergyCards(deck.energyTokens);

    if (energyErrors.length > 0) {
      errors = errors.concat(energyErrors);
      isValid = false;
    }

    const _deck = [...pokemonCards, ...trainerCards, ...energyCards];

    const cardsInDeck = _deck.reduce((sum, curr) => {
      return sum + curr.inDeck;
    }, 0);

    if (cardsInDeck != 60) {
      errors.push(`Must be 60 cards in deck, but found ${cardsInDeck}`);
      isValid = false;
    }

    // Make sure no more than 4 per card (except energies)
    const nameCountMap: Record<string, number> = {};
    for (const card of [...pokemonCards, ...trainerCards]) {
      const count = card.inDeck || 0;
      nameCountMap[card.name] = (nameCountMap[card.name] || 0) + count;
    }
    for (const [name, total] of Object.entries(nameCountMap)) {
      if (total > 4) {
        isValid = false;
        errors.push(
          `Card "${name}" exceeds limit: ${total} copies in deck (max 4 allowed).`
        );
      }
    }

    // Check ace specs
    let aceSpecCount = 0;
    let aceSpecs = new Set();
    let notStandardLegal = new Set();
    _deck.forEach((card) => {
      if (card.rarity === "ACE SPEC Rare") {
        aceSpecCount += card.inDeck;
        aceSpecs.add(card.name);
      }
      if (!card.legal?.standard) {
        console.log(card);
        notStandardLegal.add(`${card.name} ${card.set} ${card.setId}`);
      }
    });

    if (aceSpecCount > 1) {
      isValid = false;
      errors.push(
        `Deck can contain at most 1 ACE SPEC card, but found ${Array.from(
          aceSpecs
        ).join(", ")}`
      );
    }
    if (notStandardLegal.size > 0) {
      errors.push(
        `Deck contains not standard legal cards: ${Array.from(
          notStandardLegal
        ).join(", ")}`
      );
    }

    const str = JSON.stringify(_deck, null, 2);
    writeFileSync("gardiComplete.json", str);

    return {
      isValid,
      errors,
    };
  }

  async queryCardByNameAndSetCode(cardToken: CardToken) {
    if (!this.hasSetId(cardToken)) {
      throw new Error("Card Set Info not given.");
    }
    const id = this.buildCardId(cardToken);

    const cardResponse = await this.dexEn.card.list(
      Query.create().equal("id", id).equal("name", cardToken.name)
    );
    console.log(cardToken.name);
    if (cardResponse.length === 0) {
      throw new Error(`Invalid id: ${cardToken.set} ${cardToken.setId}`);
    }

    const card = await cardResponse[0].getCard();

    if (card.name !== cardToken.name) {
      throw new Error(
        `Card name "${cardToken.name}" does not match with Set Code ${cardToken.set} ${cardToken.setId}: ${card.name}.`
      );
    }
    return card;
  }

  async queryCardByName(cardToken: CardToken) {
    const cardResponse = await this.dexEn.card.list(
      Query.create().equal("name", cardToken.name)
    );

    if (cardResponse.length === 0) {
      throw new Error(`No such card name: ${cardToken.name}`);
    }

    const card = await cardResponse[0].getCard();

    return card;
  }

  async queryPokemonCards(pokemon: Array<CardToken>) {
    const results = await Promise.allSettled(
      pokemon.map(async (token) => {
        const res = await this.queryCardByNameAndSetCode(token);

        return { ...token, legal: res.legal, rarity: res.rarity };
      })
    );

    return this.buildValidationResponse(results);
  }

  async queryTrainerCards(trainers: Array<CardToken>) {
    const results = await Promise.allSettled(
      trainers.map(async (token) => {
        const res = await this.queryCardByName(token);

        return { ...token, legal: res.legal, rarity: res.rarity };
      })
    );

    return this.buildValidationResponse(results);
  }

  async queryEnergyCards(_energies: Array<CardToken>) {
    // map energy names from PTGCL exports to match limitless export format
    const energies = _energies.map((item) => ({
      ...item,
      name: energyNameMap[item.name] || item.name,
    }));

    const results = await Promise.allSettled(
      energies.map(async (token) => {
        const res = await this.queryCardByName(token);

        return { ...token, legal: res.legal, rarity: res.rarity };
      })
    );

    return this.buildValidationResponse(results);
  }

  buildValidationResponse(res: Array<PromiseSettledResult<CardToken>>) {
    const errors: string[] = [];
    const cards: Array<CardToken> = [];

    res.forEach((result) => {
      if (result.status === "fulfilled") {
        cards.push(result.value);
      } else {
        errors.push((result.reason as Error).message);
      }
    });

    return { cards, errors };
  }
  hasSetId(
    token: CardToken
  ): token is CardToken & { setId: number; set: string } {
    return typeof token.setId === "number" && typeof token.set === "string";
  }
  toCardToken(cardString: string): CardToken {
    const parts = cardString.split(" ");

    // Detect <set> <setId> suffix:
    const hasSetInfo =
      parts.length >= 4 &&
      /^[A-Za-z-]{2,5}$/.test(parts[parts.length - 2]) &&
      /^\d{1,3}$/.test(parts[parts.length - 1]);

    const nameParts = parts.slice(1, hasSetInfo ? -2 : undefined);
    const cardName = nameParts.join(" ");

    return {
      inDeck: parseInt(parts[0]),
      name: cardName,
      set: hasSetInfo ? parts[parts.length - 2] : undefined,
      setId: hasSetInfo ? parseInt(parts[parts.length - 1], 10) : undefined,
    };
  }

  buildCardId(cardToken: CardToken & { setId: number; set: string }): string {
    const lowerName = cardToken.set.toLowerCase();
    let setCode: string;
    if (intlToJapaneseSetMap.hasOwnProperty(lowerName)) {
      setCode = intlToJapaneseSetMap[lowerName];
    } else {
      throw new Error(`${cardToken.name}: "${cardToken.set!}" is not a Set!.`);
    }

    const code = setCode.toLowerCase();
    const id = cardToken.setId.toString().padStart(3, "0");
    return `${code}-${id}`;
  }
  /*
  async validate(
    config: { format: "standard" | "expanded" | "unlimited" } = {
      format: "standard",
    }
  ): Promise<ValidationResult> {
    let isValid = true;
    const errors = new Set<string>();

    // make sure we still have 60 cards
    const cardCount = this.countCards();
    if (cardCount !== 60) {
      isValid = false;
      errors.add(`Deck contains ${cardCount} cards, but should be 60.`);
    }

    // check ace specs
    let aceSpecCount = 0;
    this.deck.forEach((card) => {
      //const subtypes = card.subtypes;
      //if (!subtypes.includes("ACE SPEC" as PokemonTCG.Subtype)) {
      return;
      //}
      aceSpecCount += card.inDeck;
      // TODO maybe differentiate between multiple copies of a single ACE SPEC and various ACE SPECs
    });

    if (aceSpecCount > 1) {
      isValid = false;
      errors.add(
        `Deck can contain at most 1 ACE SPEC card, but found ${aceSpecCount}`
      );
    }

    const tooManyCopies = new Array<string>();
    // assert no unique card count > 4
    this.deck.forEach((card) => {
      if (
        card.inDeck > 4 && card.supertype !== PokemonTCG.Supertype.Energy
      ) {
        tooManyCopies.push(card.name);
      }
    });

    if (tooManyCopies.length > 0) {
      isValid = false;
      errors.add("Too many copies of cards: ".concat(tooManyCopies.join(", ")));
    }

    return { isValid, errors };
  }
  */
}

export default PTCGDeckValidator;
