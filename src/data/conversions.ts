import { SetModel } from "@tcgdex/sdk";

export const energyNameMap: Record<string, string> = {
  "Basic {L} Energy": "Lightning Energy",
  "Basic {D} Energy": "Darkness Energy",
  "Basic {F} Energy": "Fighting Energy",
  "Basic {P} Energy": "Psychic Energy",
  "Basic {M} Energy": "Metal Energy",
  "Basic {W} Energy": "Water Energy",
  "Basic {G} Energy": "Grass Energy",
  "Basic {R} Energy": "Fire Energy",
};

export const intlToJapaneseSetMap: Record<string, string> = {
  svp: "svp", // Promos
  svi: "sv01", // Scarlet & Violet
  pal: "sv02", // Paldea Evolved
  obf: "sv03", // Obsidian Flames
  mew: "sv03.5", // 151
  par: "sv04", // Paradox Rift
  paf: "sv04.5", // Paldean Fates
  tef: "sv05", // Temporal Forces
  twm: "sv06", // Twilight Masquerade
  sfa: "sv06.5", // Shrouded Fable
  scr: "sv07", // Stellar Crown
  ssp: "sv08", // Surgin Sparks
  pre: "sv08.5", // Prismatic Evolutions
  jtg: "sv09", // Journey Together
  dri: "sv10", // Destined Rivals
};

// Manual fix for abbrevations
const fixAbbreviationsMap: Record<string, string> = {
  // TCGdex uses "SV" for Scarlet & Violet, but "SVI" is printed on cards and used for Decklists
  SV: "SVI",
};
/**
 * Checks if the abbreviation exists in the fixAbbreviationsMap and replaces it in the passed object
 * @param abbr
 * @returns nothing, modifies the object in place
 */
export function fixAbbreviation(
  set: SetModel & { abbreviation?: { official?: string } }
) {
  if (set.abbreviation?.official) {
    const abbr = set.abbreviation.official;
    if (fixAbbreviationsMap[abbr]) {
      set.abbreviation.official = fixAbbreviationsMap[abbr];
    }
  }
}
