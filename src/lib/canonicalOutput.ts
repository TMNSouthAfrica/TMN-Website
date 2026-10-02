import { splitPhoneNumber } from "./normalize";
import { detectPassthroughColumns, toFieldName } from "./columnDetect";
import type { CustomerSheetConfig, ParsedSheet } from "./types";

export const CANONICAL_HEADERS = [
  "Name",
  "CountryCode",
  "Phone",
  "ContactStatus",
  "AllowCampaign",
  "AllowSMS",
] as const;

export interface CanonicalOutput {
  headers: string[];
  rows: string[][];
  /** Which passthrough fields were actually found in the source file, for the summary note. */
  foundInSource: {
    contactStatus: boolean;
  };
  /** Header names of any extra source columns the user chose to include, appended after the canonical fields. */
  extraHeaders: string[];
}

const DEFAULT_CONTACT_STATUS = "VALID";
const ALLOW_VALUE = "TRUE";

/**
 * Builds the standardized Name/CountryCode/Phone/ContactStatus/AllowCampaign/AllowSMS
 * output, regardless of what columns the source customer file actually had.
 * ContactStatus is carried through verbatim when the source has a matching column,
 * otherwise defaults to "VALID" (these are the contacts that passed the scrub).
 * AllowCampaign/AllowSMS are always "TRUE" — every row here already passed the
 * scrub, so it's cleared for broadcast/SMS regardless of what the source had.
 */
export function buildCanonicalOutput(
  sheet: ParsedSheet,
  config: CustomerSheetConfig,
  rows: string[][],
  defaultCountryCode: string,
  extraColumnIndexes: number[] = [],
): CanonicalOutput {
  const passthrough = detectPassthroughColumns(sheet.headers);
  const primaryPhoneCol = config.phoneColIndexes[0] ?? null;

  const outRows = rows.map((row) => {
    const name = config.nameColIndex !== null ? (row[config.nameColIndex] ?? "") : "";

    const explicitCc =
      config.countryCodeColIndex !== null ? row[config.countryCodeColIndex] : null;
    const phoneRaw = primaryPhoneCol !== null ? row[primaryPhoneCol] : null;
    const parts = splitPhoneNumber(phoneRaw, defaultCountryCode, explicitCc);

    const contactStatus =
      passthrough.contactStatusIndex !== null
        ? (row[passthrough.contactStatusIndex] ?? "")
        : DEFAULT_CONTACT_STATUS;

    return [
      name,
      parts?.countryCode ?? "",
      parts?.local ?? "",
      contactStatus,
      ALLOW_VALUE,
      ALLOW_VALUE,
      ...extraColumnIndexes.map((i) => row[i] ?? ""),
    ];
  });

  const extraHeaders = extraColumnIndexes.map((i) => toFieldName(sheet.headers[i] ?? ""));

  return {
    headers: [...CANONICAL_HEADERS, ...extraHeaders],
    rows: outRows,
    foundInSource: {
      contactStatus: passthrough.contactStatusIndex !== null,
    },
    extraHeaders,
  };
}

/**
 * Stacks several sheets' canonical outputs into one file. The standard fields
 * line up as-is; extra columns are matched by field name, so an "Email" column
 * ticked on two sheets lands in one Email column (blank for sheets without it).
 */
export function combineCanonicalOutputs(outputs: CanonicalOutput[]): CanonicalOutput {
  const extraHeaders: string[] = [];
  for (const output of outputs) {
    for (const header of output.extraHeaders) {
      if (!extraHeaders.includes(header)) extraHeaders.push(header);
    }
  }

  const base = CANONICAL_HEADERS.length;
  const rows = outputs.flatMap((output) =>
    output.rows.map((row) => [
      ...row.slice(0, base),
      ...extraHeaders.map((header) => {
        const i = output.extraHeaders.indexOf(header);
        return i >= 0 ? (row[base + i] ?? "") : "";
      }),
    ]),
  );

  return {
    headers: [...CANONICAL_HEADERS, ...extraHeaders],
    rows,
    foundInSource: {
      contactStatus: outputs.every((o) => o.foundInSource.contactStatus),
    },
    extraHeaders,
  };
}
