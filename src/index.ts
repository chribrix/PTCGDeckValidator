import PTCGDeckValidator from "./PTCGDeckValidatorTCGdex.js";
import { readFileSync } from "fs";
import CardRepository from "./repository/CardRepository.js";

const validator = await CardRepository.init();

const set = await validator.getSetById("base1");

console.log(set);
await validator.close();
