import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity({ tableName: "card_set" })
export class CardSet {
  @PrimaryKey()
  id!: string;

  @Property()
  name!: string;

  @Property()
  logo?: string;

  @Property()
  releaseDate!: string;

  @Property({ type: "jsonb" })
  legal!: {
    expanded: boolean;
    standard: boolean;
  };

  @Property()
  serie!: string;

  @Property()
  symbol?: string;

  @Property({ nullable: true })
  abbreviation?: string;
}
