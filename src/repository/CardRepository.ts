import TCGdex, { Query, Card, type SupportedLanguages } from "@tcgdex/sdk";

/**
 *  TODO
 *  This repo is connected to the database
 *  - database is filled beforehand with cards
 *  - fill function also handles rulings:
 *     - legality (also for reprints)
 *     - One-Only cards like ace specs
 *  -
 */

class CardRepository {
  private language: SupportedLanguages = "en"; // Default language
  private _instance: CardRepository;

  private constructor(language: SupportedLanguages) {
    this.language = language;
  }

  get instance(): CardRepository {
    return this._instance ?? new TCGdex(this.language);
  }

  public async getCardById(id: string): Promise<any> {
    // Simulate fetching card data by ID
    return { id, name: "Sample Card", type: "Pokemon" };
  }
}

export default CardRepository;
