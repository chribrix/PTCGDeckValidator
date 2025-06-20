import { PokemonTCG } from "pokemon-tcg-sdk-typescript";
import { Card } from "pokemon-tcg-sdk-typescript/dist/sdk.js";

export type Deck = Set<Card & { inDeck: number }>;

type CardToken = {
  inDeck: number;
  name: string;
  setId: number;
  set: string;
};

class CardNotProvidedbyPTCGIOError extends Error {
  constructor(name: string) {
    super(`No results provided by PokemonTCGIO for Card Name: ${name}`);
    this.name = "CardNotProvidedbyPTCGIOError";
  }
}

class PTCGDeckValidator {
  private deck: Deck;
  private energyNameMap = {
    D: "Darkness Energy",
    P: "Psychic Energy",
    R: "Fire Energy",
    F: "Fighting Energy",
    W: "Water Energy",
    G: "Grass Energy",
    M: "Metal Energy",
    L: "Lightning Energy",
  };

  async setDeck(deckString: string) {
    const lines = deckString.split(/\r?\n/);

    // filter all lines that are not cards
    // cards are formatted like this:
    // 4 Charcadet SSP 32
    const pattern = /^\d+ .+ [A-Za-z-]{2,5} \d{1,3}$/;
    let filtered = lines.filter((line) => pattern.test(line));

    // format find out set and setId to query against pokemonTcgIo
    const deckTokens: Array<CardToken> = filtered.map((card) => {
      const parts = card.split(" ");
      const length = parts.length;

      // parse energy export name differences
      // Basic {D} Energy ->> Darkness Energy

      return {
        inDeck: parseInt(parts[0]),
        name: parts.slice(1, parts.length - 2).join(" "),
        set: parts[length - 2],
        setId: parseInt(parts[length - 1]),
      };
    });

    const results = await Promise.all(
      deckTokens.map(async (token) => {
        const res = await this.getCardFromPTCGIO(token);
        return { ...res, inDeck: token.inDeck };
      })
    );

    this.deck = new Set(results) as Deck;

    console.log(this.countCards());
  }

  async validateDecklist(
    config: { format: "standard" | "expanded" | "unlimited" } = {
      format: "standard",
    }
  ): Promise<{
    isValid: boolean;
    errors?: Set<string>;
  }> {
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
      const subtypes = card.subtypes;
      if (!subtypes.includes("ACE SPEC" as PokemonTCG.Subtype)) {
        return;
      }
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
      if (card.inDeck > 4 && card.supertype !== PokemonTCG.Supertype.Energy) {
        tooManyCopies.push(card.name);
      }
      console.log(card.name, card.inDeck);
    });

    if (tooManyCopies.length > 0) {
      isValid = false;
      errors.add("Too many copies of cards: ".concat(tooManyCopies.join(", ")));
    }

    return { isValid, errors };
  }

  private async getCardFromPTCGIO(cardToken: CardToken) {
    const res = await PokemonTCG.findCardsByQueries({
      q: `name:"${cardToken.name}"`,
    });

    if (res.length == 0) {
      throw new CardNotProvidedbyPTCGIOError(cardToken.name);
    }
    return res[0];
  }
  private countCards() {
    let count = 0;
    this.deck.forEach((card) => (count += card.inDeck));

    return count;
  }
}

export default PTCGDeckValidator;
