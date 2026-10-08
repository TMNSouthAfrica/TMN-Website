"use client";

import { useState } from "react";
import { SUPPORTED_COUNTRIES } from "@/lib/normalize";

interface CountryCodeSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

const OTHER = "other";

/**
 * Picks the country a number starting with 0 belongs to. Numbers already
 * written with one of the supported country codes are recognised whatever is
 * picked here; "Other…" allows any other dial code.
 */
export default function CountryCodeSelect({ id, value, onChange }: CountryCodeSelectProps) {
  const isKnown = SUPPORTED_COUNTRIES.some((c) => c.code === value);
  const [showOther, setShowOther] = useState(!isKnown);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700">
        Default country
      </label>
      <select
        id={id}
        className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-brand-green/50 focus:outline-none"
        value={showOther ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setShowOther(true);
          } else {
            setShowOther(false);
            onChange(e.target.value);
          }
        }}
      >
        {SUPPORTED_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.name} (+{c.code})
          </option>
        ))}
        <option value={OTHER}>Other…</option>
      </select>
      {showOther && (
        <label className="flex items-center gap-1 text-sm font-semibold text-zinc-700">
          +
          <input
            id={`${id}-other`}
            type="text"
            inputMode="numeric"
            aria-label="Other country dial code"
            className="w-20 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-center text-sm font-semibold focus:ring-2 focus:ring-brand-green/50 focus:outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          />
        </label>
      )}
      <span className="text-xs text-zinc-400">
        Used for numbers starting with 0. Numbers that include a country code (+27, +263,
        +260, +44…) are recognised automatically.
      </span>
    </div>
  );
}
