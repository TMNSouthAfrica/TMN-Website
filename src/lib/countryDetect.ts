import { isValidPhoneNumber, splitPhoneNumber } from "./normalize";
import type { CustomerSheetConfig, ParsedSheet } from "./types";

export interface CountrySource {
  sheet: ParsedSheet;
  config: CustomerSheetConfig;
}

export interface CountryCount {
  /** Country calling code, or "" for numbers whose country couldn't be found. */
  code: string;
  /** Contacts (rows) whose number belongs to this country. */
  rows: number;
  /** How many of those had no country code and were given the default country. */
  assumed: number;
}

/** Used when a file has no number with a country code to learn from. */
export const FALLBACK_COUNTRY_CODE = "27";

function* rowNumbers(sources: CountrySource[]) {
  for (const { sheet, config } of sources) {
    for (const row of sheet.rows) {
      const explicitCc =
        config.countryCodeColIndex !== null ? row[config.countryCodeColIndex] : null;
      yield { row, explicitCc, phoneColIndexes: config.phoneColIndexes };
    }
  }
}

/**
 * Picks the country for numbers written without a country code (e.g. "082…"):
 * the most common country among the numbers that do carry one. Returns null
 * when no number in the files carries a country code.
 */
export function detectDefaultCountry(sources: CountrySource[]): string | null {
  const counts = new Map<string, number>();
  for (const { row, explicitCc, phoneColIndexes } of rowNumbers(sources)) {
    for (const colIndex of phoneColIndexes) {
      // With no default country, only numbers that state their country get one.
      const parts = splitPhoneNumber(row[colIndex], "", explicitCc);
      if (parts?.countryCode && !parts.assumed) {
        counts.set(parts.countryCode, (counts.get(parts.countryCode) ?? 0) + 1);
      }
    }
  }
  let best: string | null = null;
  for (const [code, count] of counts) {
    if (best === null || count > (counts.get(best) ?? 0)) best = code;
  }
  return best;
}

/**
 * Counts contacts per country, using each row's first valid phone number.
 * Rows with no valid number are left out; they're removed as invalid anyway.
 * Sorted by count, largest first, with unknown countries last.
 */
export function countCountries(sources: CountrySource[], defaultCountryCode: string): CountryCount[] {
  const counts = new Map<string, CountryCount>();
  for (const { row, explicitCc, phoneColIndexes } of rowNumbers(sources)) {
    const colIndex = phoneColIndexes.find((i) =>
      isValidPhoneNumber(row[i], defaultCountryCode, explicitCc),
    );
    if (colIndex === undefined) continue;
    const parts = splitPhoneNumber(row[colIndex], defaultCountryCode, explicitCc);
    if (!parts) continue;
    const entry = counts.get(parts.countryCode) ?? { code: parts.countryCode, rows: 0, assumed: 0 };
    entry.rows++;
    if (parts.assumed) entry.assumed++;
    counts.set(parts.countryCode, entry);
  }
  return [...counts.values()].sort((a, b) =>
    a.code === "" ? 1 : b.code === "" ? -1 : b.rows - a.rows,
  );
}
