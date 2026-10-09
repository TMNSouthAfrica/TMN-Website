import { isValidPhoneNumber, normalizePhoneNumber, splitPhoneNumber } from "./normalize";
import type {
  CustomerSheetConfig,
  OptOutSheetConfig,
  ParsedSheet,
  RemovedContact,
  ScrubResult,
} from "./types";

interface OptOutSource {
  config: OptOutSheetConfig;
  sheet: ParsedSheet;
}

/** Builds the deduplicated set of normalized opt-out numbers from every selected sheet. */
export function buildOptOutSet(
  sources: OptOutSource[],
  defaultCountryCode: string,
): Set<string> {
  const set = new Set<string>();
  for (const { config, sheet } of sources) {
    if (!config.included) continue;
    for (const row of sheet.rows) {
      for (const colIndex of config.phoneColIndexes) {
        const raw = row[colIndex];
        const explicitCc =
          config.countryCodeColIndex !== null ? row[config.countryCodeColIndex] : null;
        const normalized = normalizePhoneNumber(raw, defaultCountryCode, explicitCc);
        if (normalized) set.add(normalized);
      }
    }
  }
  return set;
}

/**
 * Removes rows with no valid phone number, dedupes the rest by normalized
 * phone number (keeping the first occurrence of each), then removes anyone
 * whose number is in `optOutSet` (pass an empty set for basic cleaning,
 * where there is no opt-out list).
 *
 * Pass the same `seenNumbers` set across several calls to dedupe across
 * multiple sheets — a number already kept from an earlier sheet is then
 * removed as a duplicate here.
 *
 * Numbers from a country in `excludedCountries` (calling code, or "" for an
 * unknown country) are ignored; a row left with no usable number is removed
 * as "excluded country" before the duplicate and opt-out checks.
 */
export function scrubCustomerSheet(
  sheet: ParsedSheet,
  config: CustomerSheetConfig,
  optOutSet: Set<string>,
  defaultCountryCode: string,
  seenNumbers: Set<string> = new Set<string>(),
  excludedCountries: ReadonlySet<string> = new Set<string>(),
): ScrubResult {
  const keptRows: string[][] = [];
  const removedRows: string[][] = [];
  const removedContacts: RemovedContact[] = [];
  const matchedOptOutNumbers = new Set<string>();
  let invalidRowsRemoved = 0;
  let duplicateRowsRemoved = 0;
  let optOutRowsRemoved = 0;
  let excludedCountryRowsRemoved = 0;

  for (const row of sheet.rows) {
    const explicitCc =
      config.countryCodeColIndex !== null ? row[config.countryCodeColIndex] : null;

    const rowNumbers = config.phoneColIndexes
      .map((colIndex) => normalizePhoneNumber(row[colIndex], defaultCountryCode, explicitCc))
      .filter((n): n is string => n !== null);

    const name = config.nameColIndex !== null ? (row[config.nameColIndex] ?? "") : "";

    const validParts = config.phoneColIndexes
      .filter((colIndex) => isValidPhoneNumber(row[colIndex], defaultCountryCode, explicitCc))
      .map((colIndex) => splitPhoneNumber(row[colIndex], defaultCountryCode, explicitCc))
      .filter((p) => p !== null);
    if (validParts.length === 0) {
      invalidRowsRemoved++;
      removedRows.push(row);
      removedContacts.push({ name, phone: rowNumbers[0] ?? "", reason: "invalid" });
      continue;
    }

    const validNumbers = validParts
      .filter((p) => !excludedCountries.has(p.countryCode))
      .map((p) => p.countryCode + p.local);
    if (validNumbers.length === 0) {
      excludedCountryRowsRemoved++;
      removedRows.push(row);
      removedContacts.push({
        name,
        phone: validParts[0].countryCode + validParts[0].local,
        reason: "excluded-country",
      });
      continue;
    }

    const isDuplicate = validNumbers.some((n) => seenNumbers.has(n));
    if (isDuplicate) {
      duplicateRowsRemoved++;
      removedRows.push(row);
      removedContacts.push({ name, phone: validNumbers[0], reason: "duplicate" });
      continue;
    }
    validNumbers.forEach((n) => seenNumbers.add(n));

    const matches = validNumbers.filter((n) => optOutSet.has(n));

    if (matches.length > 0) {
      matches.forEach((n) => matchedOptOutNumbers.add(n));
      optOutRowsRemoved++;
      removedRows.push(row);
      removedContacts.push({ name, phone: matches[0], reason: "opt-out" });
    } else {
      keptRows.push(row);
    }
  }

  const totalOriginalRows = sheet.rows.length;
  const rowsRemoved = removedRows.length;
  const rowsRemaining = keptRows.length;

  return {
    headers: sheet.headers,
    keptRows,
    removedRows,
    removedContacts,
    summary: {
      totalOriginalRows,
      totalUniqueOptOutNumbers: optOutSet.size,
      uniqueMatchedContactsRemoved: matchedOptOutNumbers.size,
      duplicateRowsRemoved,
      optOutRowsRemoved,
      invalidRowsRemoved,
      excludedCountryRowsRemoved,
      rowsRemoved,
      rowsRemaining,
      consistent: totalOriginalRows === rowsRemoved + rowsRemaining,
      defaultCountryCode,
    },
  };
}

/**
 * Merges the per-sheet results of a multi-sheet run into one result. Each
 * removed contact is tagged with the sheet it came from.
 */
export function combineScrubResults(
  parts: { label: string; result: ScrubResult }[],
): ScrubResult {
  const sum = (pick: (r: ScrubResult) => number) =>
    parts.reduce((total, { result }) => total + pick(result), 0);
  const first = parts[0].result.summary;

  return {
    headers: [],
    keptRows: parts.flatMap(({ result }) => result.keptRows),
    removedRows: parts.flatMap(({ result }) => result.removedRows),
    removedContacts: parts.flatMap(({ label, result }) =>
      result.removedContacts.map((c) => ({ ...c, source: label })),
    ),
    summary: {
      totalOriginalRows: sum((r) => r.summary.totalOriginalRows),
      totalUniqueOptOutNumbers: first.totalUniqueOptOutNumbers,
      uniqueMatchedContactsRemoved: sum((r) => r.summary.uniqueMatchedContactsRemoved),
      duplicateRowsRemoved: sum((r) => r.summary.duplicateRowsRemoved),
      optOutRowsRemoved: sum((r) => r.summary.optOutRowsRemoved),
      invalidRowsRemoved: sum((r) => r.summary.invalidRowsRemoved),
      excludedCountryRowsRemoved: sum((r) => r.summary.excludedCountryRowsRemoved),
      rowsRemoved: sum((r) => r.summary.rowsRemoved),
      rowsRemaining: sum((r) => r.summary.rowsRemaining),
      consistent: parts.every(({ result }) => result.summary.consistent),
      defaultCountryCode: first.defaultCountryCode,
    },
  };
}
