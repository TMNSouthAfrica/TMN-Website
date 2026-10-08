"use client";

import ColumnMapper, { ColumnRole } from "./ColumnMapper";
import type { ParsedSheet } from "@/lib/types";

export interface ExtraColumn {
  index: number;
  header: string;
  fieldName: string;
}

interface CustomerSheetPanelProps {
  sheet: ParsedSheet;
  roles: Record<number, ColumnRole>;
  extraColumns: ExtraColumn[];
  extraColumnsSelected: Record<number, boolean>;
  onRoleChange: (colIndex: number, role: ColumnRole) => void;
  onExtraColumnToggle: (colIndex: number, included: boolean) => void;
  /** Off when the caller already shows the row count next to the sheet name. */
  showRowCount?: boolean;
}

/** Column mapping + optional extra-column picker for one customer sheet. */
export default function CustomerSheetPanel({
  sheet,
  roles,
  extraColumns,
  extraColumnsSelected,
  onRoleChange,
  onExtraColumnToggle,
  showRowCount = true,
}: CustomerSheetPanelProps) {
  return (
    <div className="mt-3">
      {showRowCount && (
        <p className="mb-2 text-xs text-zinc-400">
          {sheet.rows.length} rows
        </p>
      )}
      {sheet.headers.length === 0 ? (
        <p className="text-sm text-zinc-400">
          This sheet appears to be empty.
        </p>
      ) : (
        <ColumnMapper
          headers={sheet.headers}
          sampleRow={sheet.rows[0]}
          roles={roles}
          onChange={onRoleChange}
          allowName
        />
      )}

      {extraColumns.length > 0 && (
        <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3.5">
          <p className="text-sm font-semibold text-zinc-800">
            Additional columns found in your file
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            These aren&rsquo;t part of the standard Name / CountryCode / Phone /
            ContactStatus / AllowCampaign / AllowSMS fields. Tick any you want carried
            into the cleaned file — everything else is left out. Multi-word column names
            are exported with underscores instead of spaces (e.g. &ldquo;Email
            address&rdquo; → &ldquo;Email_address&rdquo;).
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {extraColumns.map(({ index, header, fieldName }) => (
              <label
                key={index}
                className="flex items-center gap-2 text-sm text-zinc-700"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-green"
                  checked={extraColumnsSelected[index] ?? false}
                  onChange={(e) => onExtraColumnToggle(index, e.target.checked)}
                />
                {header || (
                  <span className="text-zinc-400 italic">
                    (unnamed column {index + 1})
                  </span>
                )}
                {fieldName !== header && (
                  <span className="text-xs text-zinc-400">
                    → exports as <span className="font-mono">{fieldName}</span>
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
