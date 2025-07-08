import { Entity, Enum, PrimaryKey, Property } from "@mikro-orm/core";

enum CardCategoryEnum {
  POKEMON = "pokemon",
  TRAINER = "trainer",
  ENERGY = "energy",
}

@Entity({ tableName: "card" })
class Cards {
  @PrimaryKey()
  id!: string;

  @Property({ name: "printed_id", nullable: true })
  printedId?: string;

  @Property({ type: "jsonb" })
  name!: { en?: string; de?: string; fr?: string; it?: string };

  @Property()
  set!: string;

  @Property()
  rarity!: string;

  @Enum(() => CardCategoryEnum)
  type!: CardCategoryEnum;

  @Property({ type: "jsonb", nullable: true })
  legal?: { expanded: boolean; standard: boolean };

  // Fields for holding additional information related to the card type
  @Property({ type: "jsonb", nullable: true })
  pokemon?: any;

  @Property({ type: "jsonb", nullable: true })
  trainer?: any;

  @Property({ type: "jsonb", nullable: true })
  energy?: any;

  @Property({ name: "api_updated_at", type: "date" })
  apiUpdatedAt!: Date;

  @Property({ name: "updated_at", type: "date", defaultRaw: "now()" })
  updatedAt: Date;
}

export { Cards, CardCategoryEnum };
