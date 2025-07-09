import PTCGDeckValidator from "./PTCGDeckValidatorTCGdex.js";
import { read, readFileSync } from "fs";
import CardRepository from "./repository/CardRepository.js";

const validator = await PTCGDeckValidator.init();

const deck = readFileSync("./debug/gardi.txt", "utf-8");
const validationResponse = await validator.check(deck);
console.log(validationResponse);

await validator.close();
