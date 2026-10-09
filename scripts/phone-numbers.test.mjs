// Checks how phone numbers are read and split into CountryCode + Phone.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  splitPhoneNumber,
} from "../src/lib/normalize.ts";

// [as written in the file, default country, separate country-code column, expected "CountryCode|Phone"]
const CASES = [
  // South Africa, every common way of writing it
  ["082 123 4567", "27", null, "27|821234567"],
  ["+27 82 123 4567", "27", null, "27|821234567"],
  ["'+27725072661", "27", null, "27|725072661"],
  ["27821234567", "27", null, "27|821234567"],
  ["+27 (0)82 123 4567", "27", null, "27|821234567"],
  ["0027821234567", "27", null, "27|821234567"],
  ["821234567", "27", null, "27|821234567"],
  // Southern Africa
  ["+263 77 123 4567", "27", null, "263|771234567"],
  ["263771234567", "27", null, "263|771234567"],
  ["00263771234567", "27", null, "263|771234567"],
  ["077 123 4567", "263", null, "263|771234567"],
  ["+267 71 234 567", "27", null, "267|71234567"],
  ["71234567", "267", null, "267|71234567"],
  ["+266 5012 3456", "27", null, "266|50123456"],
  ["+268 7612 3456", "27", null, "268|76123456"],
  ["+258 84 123 4567", "27", null, "258|841234567"],
  ["+264 81 123 4567", "27", null, "264|811234567"],
  ["081 123 4567", "264", null, "264|811234567"],
  // Any other country code
  ["'+260967580737", "27", null, "260|967580737"],
  ["260967580737", "27", null, "260|967580737"],
  ["+265 88 274 2723", "27", null, "265|882742723"],
  ["255712345678", "27", null, "255|712345678"],
  ["+44 7700 900123", "27", null, "44|7700900123"],
  ["+44 (0)7700 900123", "27", null, "44|7700900123"],
  ["+1 212 555 0100", "27", null, "1|2125550100"],
  ["0044 7700 900123", "27", null, "44|7700900123"],
  // A local number typed with an extra 0 isn't read as international
  ["0082 595 1668", "27", null, "27|825951668"],
  ["00798351823", "27", null, "27|798351823"],
  ["0077 123 4567", "263", null, "263|771234567"],
  // A mistyped 10-digit local number isn't given a foreign country code
  ["8212345678", "27", null, "|8212345678"],
  // Separate country-code column
  ["0821234567", "27", "27", "27|821234567"],
  ["270821234567", "27", "27", "27|821234567"],
  ["0967580737", "27", "+260", "260|967580737"],
];

for (const [raw, defaultCc, explicitCc, expected] of CASES) {
  test(`${raw} (default +${defaultCc}${explicitCc ? `, column ${explicitCc}` : ""})`, () => {
    const parts = splitPhoneNumber(raw, defaultCc, explicitCc);
    assert.equal(parts ? `${parts.countryCode}|${parts.local}` : "null", expected);
    // Matching/dedupe uses the same digits as the export.
    assert.equal(normalizePhoneNumber(raw, defaultCc, explicitCc), expected.replace("|", ""));
  });
}

test("placeholders and junk are invalid", () => {
  for (const raw of ["0000000000", "123", "", null, "n/a", "+2700000000"]) {
    assert.equal(isValidPhoneNumber(raw, "27"), false, String(raw));
  }
});

test("real numbers are valid", () => {
  for (const raw of ["082 123 4567", "+260 96 758 0737", "+44 7700 900123", "+267 71 234 567"]) {
    assert.equal(isValidPhoneNumber(raw, "27"), true, raw);
  }
});
