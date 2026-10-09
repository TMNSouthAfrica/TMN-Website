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
 * Every country calling code in use (ITU E.164 geographic codes) with the
 * country's name and ISO code (for its flag). No code is the start of
 * another, so at most one can match the front of a number.
 */
const COUNTRY_DIRECTORY: Record<string, [name: string, iso: string]> = {
  "1": ["USA / Canada", "US"], "7": ["Russia / Kazakhstan", "RU"],
  "20": ["Egypt", "EG"], "211": ["South Sudan", "SS"], "212": ["Morocco", "MA"], "213": ["Algeria", "DZ"],
  "216": ["Tunisia", "TN"], "218": ["Libya", "LY"], "220": ["Gambia", "GM"], "221": ["Senegal", "SN"],
  "222": ["Mauritania", "MR"], "223": ["Mali", "ML"], "224": ["Guinea", "GN"], "225": ["Côte d'Ivoire", "CI"],
  "226": ["Burkina Faso", "BF"], "227": ["Niger", "NE"], "228": ["Togo", "TG"], "229": ["Benin", "BJ"],
  "230": ["Mauritius", "MU"], "231": ["Liberia", "LR"], "232": ["Sierra Leone", "SL"], "233": ["Ghana", "GH"],
  "234": ["Nigeria", "NG"], "235": ["Chad", "TD"], "236": ["Central African Republic", "CF"],
  "237": ["Cameroon", "CM"], "238": ["Cape Verde", "CV"], "239": ["São Tomé and Príncipe", "ST"],
  "240": ["Equatorial Guinea", "GQ"], "241": ["Gabon", "GA"], "242": ["Congo", "CG"], "243": ["DR Congo", "CD"],
  "244": ["Angola", "AO"], "245": ["Guinea-Bissau", "GW"], "246": ["British Indian Ocean Territory", "IO"],
  "247": ["Ascension Island", "AC"], "248": ["Seychelles", "SC"], "249": ["Sudan", "SD"], "250": ["Rwanda", "RW"],
  "251": ["Ethiopia", "ET"], "252": ["Somalia", "SO"], "253": ["Djibouti", "DJ"], "254": ["Kenya", "KE"],
  "255": ["Tanzania", "TZ"], "256": ["Uganda", "UG"], "257": ["Burundi", "BI"], "258": ["Mozambique", "MZ"],
  "260": ["Zambia", "ZM"], "261": ["Madagascar", "MG"], "262": ["Réunion / Mayotte", "RE"], "263": ["Zimbabwe", "ZW"],
  "264": ["Namibia", "NA"], "265": ["Malawi", "MW"], "266": ["Lesotho", "LS"], "267": ["Botswana", "BW"],
  "268": ["Eswatini", "SZ"], "269": ["Comoros", "KM"], "27": ["South Africa", "ZA"], "290": ["Saint Helena", "SH"],
  "291": ["Eritrea", "ER"], "297": ["Aruba", "AW"], "298": ["Faroe Islands", "FO"], "299": ["Greenland", "GL"],
  "30": ["Greece", "GR"], "31": ["Netherlands", "NL"], "32": ["Belgium", "BE"], "33": ["France", "FR"],
  "34": ["Spain", "ES"], "350": ["Gibraltar", "GI"], "351": ["Portugal", "PT"], "352": ["Luxembourg", "LU"],
  "353": ["Ireland", "IE"], "354": ["Iceland", "IS"], "355": ["Albania", "AL"], "356": ["Malta", "MT"],
  "357": ["Cyprus", "CY"], "358": ["Finland", "FI"], "359": ["Bulgaria", "BG"], "36": ["Hungary", "HU"],
  "370": ["Lithuania", "LT"], "371": ["Latvia", "LV"], "372": ["Estonia", "EE"], "373": ["Moldova", "MD"],
  "374": ["Armenia", "AM"], "375": ["Belarus", "BY"], "376": ["Andorra", "AD"], "377": ["Monaco", "MC"],
  "378": ["San Marino", "SM"], "379": ["Vatican City", "VA"], "380": ["Ukraine", "UA"], "381": ["Serbia", "RS"],
  "382": ["Montenegro", "ME"], "383": ["Kosovo", "XK"], "385": ["Croatia", "HR"], "386": ["Slovenia", "SI"],
  "387": ["Bosnia and Herzegovina", "BA"], "389": ["North Macedonia", "MK"], "39": ["Italy", "IT"],
  "40": ["Romania", "RO"], "41": ["Switzerland", "CH"], "420": ["Czechia", "CZ"], "421": ["Slovakia", "SK"],
  "423": ["Liechtenstein", "LI"], "43": ["Austria", "AT"], "44": ["United Kingdom", "GB"], "45": ["Denmark", "DK"],
  "46": ["Sweden", "SE"], "47": ["Norway", "NO"], "48": ["Poland", "PL"], "49": ["Germany", "DE"],
  "500": ["Falkland Islands", "FK"], "501": ["Belize", "BZ"], "502": ["Guatemala", "GT"], "503": ["El Salvador", "SV"],
  "504": ["Honduras", "HN"], "505": ["Nicaragua", "NI"], "506": ["Costa Rica", "CR"], "507": ["Panama", "PA"],
  "508": ["Saint Pierre and Miquelon", "PM"], "509": ["Haiti", "HT"], "51": ["Peru", "PE"], "52": ["Mexico", "MX"],
  "53": ["Cuba", "CU"], "54": ["Argentina", "AR"], "55": ["Brazil", "BR"], "56": ["Chile", "CL"],
  "57": ["Colombia", "CO"], "58": ["Venezuela", "VE"], "590": ["Guadeloupe", "GP"], "591": ["Bolivia", "BO"],
  "592": ["Guyana", "GY"], "593": ["Ecuador", "EC"], "594": ["French Guiana", "GF"], "595": ["Paraguay", "PY"],
  "596": ["Martinique", "MQ"], "597": ["Suriname", "SR"], "598": ["Uruguay", "UY"], "599": ["Curaçao", "CW"],
  "60": ["Malaysia", "MY"], "61": ["Australia", "AU"], "62": ["Indonesia", "ID"], "63": ["Philippines", "PH"],
  "64": ["New Zealand", "NZ"], "65": ["Singapore", "SG"], "66": ["Thailand", "TH"], "670": ["Timor-Leste", "TL"],
  "672": ["Norfolk Island", "NF"], "673": ["Brunei", "BN"], "674": ["Nauru", "NR"], "675": ["Papua New Guinea", "PG"],
  "676": ["Tonga", "TO"], "677": ["Solomon Islands", "SB"], "678": ["Vanuatu", "VU"], "679": ["Fiji", "FJ"],
  "680": ["Palau", "PW"], "681": ["Wallis and Futuna", "WF"], "682": ["Cook Islands", "CK"], "683": ["Niue", "NU"],
  "685": ["Samoa", "WS"], "686": ["Kiribati", "KI"], "687": ["New Caledonia", "NC"], "688": ["Tuvalu", "TV"],
  "689": ["French Polynesia", "PF"], "690": ["Tokelau", "TK"], "691": ["Micronesia", "FM"],
  "692": ["Marshall Islands", "MH"], "81": ["Japan", "JP"], "82": ["South Korea", "KR"], "84": ["Vietnam", "VN"],
  "850": ["North Korea", "KP"], "852": ["Hong Kong", "HK"], "853": ["Macau", "MO"], "855": ["Cambodia", "KH"],
  "856": ["Laos", "LA"], "86": ["China", "CN"], "880": ["Bangladesh", "BD"], "886": ["Taiwan", "TW"],
  "90": ["Turkey", "TR"], "91": ["India", "IN"], "92": ["Pakistan", "PK"], "93": ["Afghanistan", "AF"],
  "94": ["Sri Lanka", "LK"], "95": ["Myanmar", "MM"], "960": ["Maldives", "MV"], "961": ["Lebanon", "LB"],
  "962": ["Jordan", "JO"], "963": ["Syria", "SY"], "964": ["Iraq", "IQ"], "965": ["Kuwait", "KW"],
  "966": ["Saudi Arabia", "SA"], "967": ["Yemen", "YE"], "968": ["Oman", "OM"], "970": ["Palestine", "PS"],
  "971": ["United Arab Emirates", "AE"], "972": ["Israel", "IL"], "973": ["Bahrain", "BH"], "974": ["Qatar", "QA"],
  "975": ["Bhutan", "BT"], "976": ["Mongolia", "MN"], "977": ["Nepal", "NP"], "98": ["Iran", "IR"],
  "992": ["Tajikistan", "TJ"], "993": ["Turkmenistan", "TM"], "994": ["Azerbaijan", "AZ"], "995": ["Georgia", "GE"],
  "996": ["Kyrgyzstan", "KG"], "998": ["Uzbekistan", "UZ"],
};

const COUNTRY_CALLING_CODES = new Set(Object.keys(COUNTRY_DIRECTORY));

/** Display name and flag for a country calling code; "" means no code could be found. */
export function countryInfo(code: string): { name: string; flag: string } {
  const entry = COUNTRY_DIRECTORY[code];
  if (!entry) return { name: code ? `+${code}` : "Unknown country", flag: "🌐" };
  const [name, iso] = entry;
  const flag = String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  return { name, flag };
}

/** A number without + or 00 is only read as international from this length up. */
const MIN_INTERNATIONAL_LENGTH = 11;

/**
 * Digits needed after a "00" prefix for it to be an international number
 * (country code + subscriber number). Fewer means a local number typed with
 * an extra 0, e.g. "0082 595 1668" is 082 595 1668, not South Korea.
 */
const MIN_DIGITS_AFTER_00 = 10;

function countryCallingCodeOf(digits: string): string | null {
  for (const length of [1, 2, 3]) {
    const prefix = digits.slice(0, length);
    if (digits.length > length && COUNTRY_CALLING_CODES.has(prefix)) return prefix;
  }
  return null;
}

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
 * number. That is checked on the digits as typed (before any leading-zero
 * stripping or country-code merging) so a placeholder is still caught even
 * though merging a country code onto it would otherwise break up the repeated
 * run. A country code followed by one repeated digit is rejected as well.
 */
export function isValidPhoneNumber(
  raw: string | number | null | undefined,
  defaultCountryCode: string,
  explicitCountryCode?: string | number | null,
): boolean {
  const digits = onlyDigits(raw);
  if (!digits) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const parts = splitPhoneNumber(raw, defaultCountryCode, explicitCountryCode);
  const normalized = parts ? parts.countryCode + parts.local : "";
  if (normalized.length < 8 || normalized.length > 15) return false;
  // A real country code followed by one repeated digit ("+27 000 000 000") is a placeholder too.
  if (/^(\d)\1+$/.test(parts?.local ?? "")) return false;

  return true;
}

export interface PhoneParts {
  countryCode: string;
  local: string;
  /** True when the number carried no country code and the default country was applied. */
  assumed?: boolean;
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
 *     ("0027821234567"), so it is dropped and the rest read as international,
 *     as is a number written with a "+". When too few digits follow the "00"
 *     for an international number ("0082 595 1668"), it's a local number
 *     typed with an extra 0 and is read as one.
 *  4. A single leading 0 means a local number: it is replaced with
 *     `defaultCountryCode`.
 *  5. A number (without + or 00) exactly as long as a local number of the
 *     default country (Excel dropped its leading 0, e.g. "821234567") also
 *     gets the default country code.
 *  6. A number starting with one of SUPPORTED_COUNTRIES' codes is split there,
 *     dropping a 0 written after the code ("+27 (0)82…").
 *  7. A number starting with any other country calling code is split there
 *     too, if it was written with + or 00 or is long enough to be
 *     international (so a mistyped local number isn't given a foreign code).
 *  8. Anything else keeps its digits as the local number with the country code
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
  if (
    !String(raw).includes("+") &&
    digits.startsWith("00") &&
    digits.length - 2 < MIN_DIGITS_AFTER_00
  ) {
    digits = digits.slice(1);
  }
  const writtenInternational = String(raw).includes("+") || digits.startsWith("00");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    if (!digits) return null;
  } else if (digits.startsWith("0")) {
    const local = digits.slice(1);
    if (!local) return null;
    return { countryCode: defaultCc, local, assumed: true };
  }

  const defaultCountry = SUPPORTED_COUNTRIES.find((c) => c.code === defaultCc);
  if (
    !writtenInternational &&
    defaultCountry &&
    (defaultCountry.localLengths as readonly number[]).includes(digits.length)
  ) {
    return { countryCode: defaultCc, local: digits, assumed: true };
  }

  const known = SUPPORTED_COUNTRIES.find(
    (c) => digits.startsWith(c.code) && digits.length > c.code.length,
  );
  if (known) {
    return { countryCode: known.code, local: dropLeadingZero(digits.slice(known.code.length)) };
  }

  const anyCode = countryCallingCodeOf(digits);
  if (anyCode && (writtenInternational || digits.length >= MIN_INTERNATIONAL_LENGTH)) {
    return { countryCode: anyCode, local: dropLeadingZero(digits.slice(anyCode.length)) };
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
