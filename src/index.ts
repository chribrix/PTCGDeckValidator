import PTCGDeckValidator from "./PTCGDeckValidator.js";
import { readFileSync } from "fs";
import "dotenv/config";

const validator = new PTCGDeckValidator();
const testDecklist = readFileSync("debug/decklist.txt").toString();
await validator.setDeck(testDecklist);
const validResult = await validator.validateDecklist();

console.dir(validResult);
