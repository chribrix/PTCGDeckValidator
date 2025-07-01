import TCGdex, { Query } from "@tcgdex/sdk";
import PTCGDeckValidator, {
  type ValidationResult,
} from "./PTCGDeckValidatorTCGdex.js";
import { readFileSync, writeFileSync } from "fs";

const validator = new PTCGDeckValidator();
const testDecklist = readFileSync("debug/gardi.txt").toString();

const tdex = new TCGdex("en");
const res = await tdex.card.list(Query.create().equal("name", "Ultra Ball"));

const balls: unknown[] = [];

const results = await Promise.allSettled(
  res.map(async (token) => {
    const card = await token.getCard();
    balls.push(card);
  })
);

function safeStringify(obj: any) {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    function (key, value) {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      return value;
    },
    2
  ); // pretty print
}
const niceBalls = safeStringify(balls);
writeFileSync("balls.json", niceBalls);
//const fu = await validator.queryCardString("sv09-155", name);

//console.log(fu);
//go();

async function go() {
  const validationResult: ValidationResult = await validator.check(
    testDecklist
  );
  console.log("Validation Result");
  console.dir(validationResult);

  //const validResult = await validator.validateDecklist();

  //console.dir(validResult);
}
/*
import TCGdex, { Query } from "@tcgdex/sdk";

const tcgdex = new TCGdex("de");
const card = await tcgdex.card.list(
  Query.create().contains("name", "Erstklassiger Fänger") // Match exact name
);

console.dir(await card[0].getCard(), { depth: 10 });
*/
