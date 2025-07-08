import { EntityManager, MikroORM } from "@mikro-orm/postgresql";

import { Cards } from "../db/entities/Cards.js";
import { CardSet } from "../db/entities/CardSet.js";

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
  private mikroOrm: MikroORM | null = null;
  private _em: EntityManager | null = null;

  private constructor(mikroOrm: MikroORM) {
    this.mikroOrm = mikroOrm;
    this._em = mikroOrm.em.fork(); // Use a forked EntityManager for operations
  }

  static async init() {
    const mikroOrm = await MikroORM.init();
    return new CardRepository(mikroOrm);
  }

  get em(): EntityManager {
    if (!this._em) {
      throw new Error("EntityManager is not initialized.");
    }
    return this._em;
  }

  public async getSetById(id: string): Promise<CardSet | null> {
    const set = await this.em.findOne(CardSet, { id });
    return set;
  }

  public async getCardById(id: string): Promise<any> {
    return { id, name: "Sample Card", type: "Pokemon" };
  }

  public async getCardsBySetId(setId: string): Promise<Cards[] | null> {
    const res = await this.em.find(Cards, { set: setId });

    return res;
  }

  public async getMultipleCardsByIds(ids: string[]): Promise<Cards[] | null> {
    if (!ids || ids.length === 0) return [];

    const cards = await this.em.find(Cards, { id: { $in: ids } });

    return cards;
  }

  public async close() {
    if (this.mikroOrm) {
      await this.mikroOrm.close();
    }
  }
}
export default CardRepository;
