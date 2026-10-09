"use client";

import { useState } from "react";
import { countryInfo, SUPPORTED_COUNTRIES } from "@/lib/normalize";
import type { CountryCount } from "@/lib/countryDetect";

interface CountryPanelProps {
  countries: CountryCount[];
  excluded: ReadonlySet<string>;
  onToggle: (code: string, included: boolean) => void;
  onSetAll: (included: boolean) => void;
  /** Country applied to numbers written without a country code. */
  localCountry: string;
  /** What the tool detected from the files; null when no number carried a country code. */
  detectedCountry: string | null;
  /** null = follow the detected country. */
  onLocalCountryChange: (code: string | null) => void;
  localCountryOverridden: boolean;
}

const AUTO = "auto";
const OTHER = "other";

/**
 * Lists the countries found in the uploaded numbers, each with a tick box to
 * include or exclude it, and says which country numbers starting with 0 were
 * given (detected from the files, changeable).
 */
export default function CountryPanel({
  countries,
  excluded,
  onToggle,
  onSetAll,
  localCountry,
  detectedCountry,
  onLocalCountryChange,
  localCountryOverridden,
}: CountryPanelProps) {
  const [showOther, setShowOther] = useState(false);
  const totalRows = countries.reduce((sum, c) => sum + c.rows, 0);
  const includedRows = countries.reduce((sum, c) => sum + (excluded.has(c.code) ? 0 : c.rows), 0);
  const assumedRows = countries.reduce((sum, c) => sum + c.assumed, 0);

  const choices = [
    ...new Set([
      ...countries.map((c) => c.code).filter(Boolean),
      ...SUPPORTED_COUNTRIES.map((c) => c.code),
      localCountry,
    ]),
  ];
  const label = (code: string) => {
    const { name, flag } = countryInfo(code);
    return `${flag} ${name} (+${code})`;
  };

  return (
    <div className="animate-fade-up rounded-2xl border border-zinc-100 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-zinc-800">Countries found</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">
            {includedRows.toLocaleString()} of {totalRows.toLocaleString()} contacts included
          </span>
          <button
            type="button"
            onClick={() => onSetAll(true)}
            disabled={includedRows === totalRows}
            className="rounded-full border border-brand-green/40 px-3 py-1 text-xs font-semibold text-brand-green transition-colors hover:bg-brand-green/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => onSetAll(false)}
            disabled={includedRows === 0}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Deselect all
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Detected from the phone numbers in your file(s). Untick a country to leave its contacts out
        of the cleaned file — they&rsquo;re listed as &ldquo;Excluded country&rdquo; in the
        removed-contacts list.
      </p>

      <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {countries.map((c) => {
          const { name, flag } = countryInfo(c.code);
          const included = !excluded.has(c.code);
          return (
            <label
              key={c.code || "unknown"}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${
                included ? "border-brand-green/30 bg-brand-green/5 text-zinc-800" : "border-zinc-100 text-zinc-400"
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-green"
                checked={included}
                onChange={(e) => onToggle(c.code, e.target.checked)}
              />
              <span aria-hidden="true">{flag}</span>
              <span className="min-w-0 flex-1 truncate">
                {name}
                {c.code && <span className="text-zinc-400"> +{c.code}</span>}
              </span>
              <span className="tabular-nums text-xs font-semibold">{c.rows.toLocaleString()}</span>
            </label>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 text-sm text-zinc-700">
        <label htmlFor="local-country">Numbers starting with 0{assumedRows > 0 && ` (${assumedRows.toLocaleString()})`} are treated as</label>
        <select
          id="local-country"
          className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-brand-green/50 focus:outline-none"
          value={showOther ? OTHER : localCountryOverridden ? localCountry : AUTO}
          onChange={(e) => {
            const v = e.target.value;
            setShowOther(v === OTHER);
            if (v === AUTO) onLocalCountryChange(null);
            else if (v !== OTHER) onLocalCountryChange(v);
          }}
        >
          <option value={AUTO}>
            {detectedCountry ? `${label(detectedCountry)} — detected` : `${label(localCountry)} — default`}
          </option>
          {choices.map((code) => (
            <option key={code} value={code}>
              {label(code)}
            </option>
          ))}
          <option value={OTHER}>Other…</option>
        </select>
        {showOther && (
          <span className="flex items-center gap-1 font-semibold">
            +
            <input
              id="local-country-other"
              type="text"
              inputMode="numeric"
              aria-label="Other country dial code"
              className="w-20 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-center text-sm font-semibold focus:ring-2 focus:ring-brand-green/50 focus:outline-none"
              value={localCountry}
              onChange={(e) => onLocalCountryChange(e.target.value.replace(/\D/g, "") || null)}
            />
          </span>
        )}
        {!detectedCountry && !localCountryOverridden && (
          <span className="text-xs text-amber-700">
            No number in your file includes a country code, so South Africa is assumed — change it if
            needed.
          </span>
        )}
      </div>
    </div>
  );
}
