/**
 * Countries the tool knows how to read. `localLengths` is how many digits a
 * number has after the country code (without the leading 0), used to spot a
 * local number whose leading 0 was dropped (e.g. by Excel) and to tell a local
 * number apart from one that already starts with a country code.
 */
export const SUPPORTED_COUNTRIES = [
  { code: "27", name: "South Africa", flag: "🇿🇦", localLengths: [9] },
  { code: "263", name: "Zimbabwe", flag: "🇿🇼", localLengths: [9] },
  { code: "267", name: "Botswana", flag: "🇧🇼", localLengths: [7, 8] },
  { code: "266", name: "Lesotho", flag: "🇱🇸", localLengths: [8] },
  { code: "268", name: "Eswatini", flag: "🇸🇿", localLengths: [8] },
  { code: "258", name: "Mozambique", flag: "🇲🇿", localLengths: [8, 9] },
  { code: "264", name: "Namibia", flag: "🇳🇦", localLengths: [8, 9] },
] as const;

/**
 * Normalizes a raw phone number value into a pure-digit string, e.g. "27821234567".
 * It is the country code and local number from splitPhoneNumber joined
 * together, so matching and export always agree. Returns null if there are no
 * digits to work with.
 */
export function normalizePhoneNumber(
  raw: string | number | null | undefined,
  defaultCountryCode: string,
  explicitCountryCode?: string | number | null,
): string | null {
  const parts = splitPhoneNumber(raw, defaultCountryCode, explicitCountryCode);
  return parts ? parts.countryCode + parts.local : null;
}

function onlyDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\D/g, "");
}

/** Strips an already-present country-code prefix from a local number, e.g. local "27821234567" with ccDigits "27" -> "821234567". Leaves the local number untouched if it's just the country code alone. */
function stripCountryCodePrefix(local: string, ccDigits: string): string {
  if (ccDigits && local.startsWith(ccDigits) && local.length > ccDigits.length) {
    return local.slice(ccDigits.length);
  }
  return local;
}

/**
 * Plausibility check for a raw phone number value. Rejects values with no
 * digits, values that normalize to something shorter or longer than any real
 * phone number uses (E.164 caps international numbers at 15 digits), and
 * values that are just the same digit repeated as typed — a common
 * placeholder for missing data ("0000000000") rather than a real contact
 * number. Checked on the digits as typed (before any leading-zero stripping
 * or country-code merging) so a placeholder is still caught even though
 * merging a country code onto it would otherwise break up the repeated run.
 */
export function isValidPhoneNumber(
  raw: string | number | null | undefined,
  defaultCountryCode: string,
  explicitCountryCode?: string | number | null,
): boolean {
  const digits = onlyDigits(raw);
  if (!digits) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const normalized = normalizePhoneNumber(raw, defaultCountryCode, explicitCountryCode);
  if (!normalized || normalized.length < 8 || normalized.length > 15) return false;

  return true;
}

export interface PhoneParts {
  countryCode: string;
  local: string;
}

/**
 * Splits a raw phone number into country code and local number.
 *
 * Rules:
 *  1. Strip everything that isn't a digit.
 *  2. If a separate country-code value is supplied, strip any leading 0 from the
 *     local number, strip that same country code if the number already has it
 *     baked in (e.g. CountryCode=27, Phone=27821234567), then strip a 0 left
 *     after it ("27 082…").
 *  3. Otherwise a leading "00" is the international dialling prefix
 *     ("0027821234567"), so it is dropped and the rest read as international.
 *  4. A single leading 0 means a local number: it is replaced with
 *     `defaultCountryCode`.
 *  5. A number exactly as long as a local number of the default country
 *     (Excel dropped its leading 0, e.g. "821234567") also gets the default
 *     country code.
 *  6. A number starting with one of SUPPORTED_COUNTRIES' codes is split there,
 *     dropping a 0 written after the code ("+27 (0)82…").
 *  7. Anything else keeps its digits as the local number with the country code
 *     left blank rather than guessed.
 */
export function splitPhoneNumber(
  raw: string | number | null | undefined,
  defaultCountryCode: string,
  explicitCountryCode?: string | number | null,
): PhoneParts | null {
  let digits = onlyDigits(raw);
  if (!digits) return null;

  const ccDigits = onlyDigits(explicitCountryCode);
  if (ccDigits) {
    const local = dropLeadingZero(
      stripCountryCodePrefix(digits.startsWith("0") ? digits.slice(1) : digits, ccDigits),
    );
    if (!local) return null;
    return { countryCode: ccDigits, local };
  }

  const defaultCc = onlyDigits(defaultCountryCode);

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    if (!digits) return null;
  } else if (digits.startsWith("0")) {
    const local = digits.slice(1);
    if (!local) return null;
    return { countryCode: defaultCc, local };
  }

  const defaultCountry = SUPPORTED_COUNTRIES.find((c) => c.code === defaultCc);
  if (defaultCountry && (defaultCountry.localLengths as readonly number[]).includes(digits.length)) {
    return { countryCode: defaultCc, local: digits };
  }

  const known = SUPPORTED_COUNTRIES.find(
    (c) => digits.startsWith(c.code) && digits.length > c.code.length,
  );
  if (known) {
    return { countryCode: known.code, local: dropLeadingZero(digits.slice(known.code.length)) };
  }

  if (defaultCc && digits.startsWith(defaultCc) && digits.length > defaultCc.length) {
    return { countryCode: defaultCc, local: dropLeadingZero(digits.slice(defaultCc.length)) };
  }

  return { countryCode: "", local: digits };
}

/** Drops one 0 written straight after a country code ("27 (0)82…"), keeping a lone "0". */
function dropLeadingZero(local: string): string {
  return local.length > 1 && local.startsWith("0") ? local.slice(1) : local;
}
