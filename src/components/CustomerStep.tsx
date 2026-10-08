"use client";

import { useState } from "react";
import Dropzone from "./Dropzone";
import CountryCodeSelect from "./CountryCodeSelect";
import type { ColumnRole } from "./ColumnMapper";
import Button from "./Button";
import CustomerSheetPanel, { type ExtraColumn } from "./CustomerSheetPanel";
import { sheetKey } from "./OptOutStep";
import type { ParsedFile } from "@/lib/types";

export interface CustomerSheetState {
  included: boolean;
  roles: Record<number, ColumnRole>;
  extraColumnsSelected: Record<number, boolean>;
}

interface CustomerStepProps {
  stepNumber: number;
  showOptOutCopy: boolean;
  defaultCountryCode: string;
  onDefaultCountryCodeChange: (value: string) => void;
  files: ParsedFile[];
  sheets: Record<string, CustomerSheetState>;
  extraColumnsFor: (key: string) => ExtraColumn[];
  onFiles: (files: File[]) => void;
  onIncludedChange: (key: string, included: boolean) => void;
  onRoleChange: (key: string, colIndex: number, role: ColumnRole) => void;
  onExtraColumnToggle: (key: string, colIndex: number, included: boolean) => void;
  onRemoveFile: (fileId: string) => void;
  onRemoveAll: () => void;
  onBack: () => void;
  onRun: () => void;
  canRun: boolean;
  includedCount: number;
  loading: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
}

/**
 * Customer upload for both cleaning types. Takes one file or many (50+ is
 * fine): every included sheet is cleaned together and, when there is more
 * than one, exported as a single combined CSV.
 */
export default function CustomerStep({
  stepNumber,
  showOptOutCopy,
  defaultCountryCode,
  onDefaultCountryCodeChange,
  files,
  sheets,
  extraColumnsFor,
  onFiles,
  onIncludedChange,
  onRoleChange,
  onExtraColumnToggle,
  onRemoveFile,
  onRemoveAll,
  onBack,
  onRun,
  canRun,
  includedCount,
  loading,
  progress,
  error,
}: CustomerStepProps) {
  // With a single file the column mapping is shown as before. In a batch it's
  // tucked away per sheet so the list stays readable; a sheet with no phone
  // column picked opens automatically.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const includedRows = files.reduce(
    (total, file) =>
      total +
      file.sheets.reduce(
        (sum, sheet) => sum + (sheets[sheetKey(file.id, sheet.name)]?.included ? sheet.rows.length : 0),
        0,
      ),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          {stepNumber}. Upload the customer database(s) to clean
        </h2>
        <p className="mt-2 text-base text-zinc-500">
          {showOptOutCopy
            ? "This is the contact list that needs opt-outs removed before use. Nothing here is modified in your opt-out file — it’s read-only reference data."
            : "This is the contact list to format and dedupe for your broadcast."}{" "}
          You can add one file or many at once (50+ is fine). When you clean more than one,
          everything is deduped together and you get one combined CSV.
        </p>
      </div>

      <CountryCodeSelect
        id="customer-cc"
        value={defaultCountryCode}
        onChange={onDefaultCountryCodeChange}
      />

      <Dropzone
        label={
          progress
            ? `Reading file ${progress.done} of ${progress.total}…`
            : files.length > 0
              ? "Drop more customer files here"
              : "Drop the customer database(s) here"
        }
        helpText="Select or drag in as many spreadsheets / CSVs as you like. If a file has multiple sheets, the largest is included — tick any others below."
        multiple
        onFiles={onFiles}
        disabled={loading}
      />

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <span>
            <strong className="text-zinc-800">{files.length}</strong>{" "}
            {files.length === 1 ? "file" : "files"} ·{" "}
            <strong className="text-zinc-800">{includedCount}</strong>{" "}
            {includedCount === 1 ? "sheet" : "sheets"} selected ·{" "}
            <strong className="text-zinc-800">{includedRows.toLocaleString()}</strong> rows
          </span>
          {files.length > 1 && (
            <button
              type="button"
              onClick={onRemoveAll}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Remove all files
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="animate-fade-up rounded-2xl border border-zinc-100 p-3.5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="truncate font-semibold text-zinc-800">{file.fileName}</h3>
              <button
                type="button"
                onClick={() => onRemoveFile(file.id)}
                className="shrink-0 text-xs font-medium text-red-600 hover:underline"
              >
                Remove file
              </button>
            </div>

            <div className="mt-2 flex flex-col gap-2">
              {file.sheets.map((sheet) => {
                const key = sheetKey(file.id, sheet.name);
                const state = sheets[key];
                if (!state) return null;
                const phoneHeaders = Object.entries(state.roles)
                  .filter(([, role]) => role === "phone")
                  .map(([i]) => sheet.headers[Number(i)] || `column ${Number(i) + 1}`);
                const missingPhone =
                  state.included && sheet.headers.length > 0 && phoneHeaders.length === 0;
                const isOpen =
                  state.included && (expanded[key] ?? (missingPhone || files.length === 1));
                return (
                  <div key={key} className="rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <label className="flex items-center gap-2 font-medium text-zinc-800">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-brand-green"
                          checked={state.included}
                          onChange={(e) => onIncludedChange(key, e.target.checked)}
                        />
                        {file.sheets.length > 1 ? `Sheet: ${sheet.name}` : "Include"}
                      </label>
                      <span className="text-xs text-zinc-400">
                        {sheet.rows.length.toLocaleString()} rows
                      </span>
                      {state.included &&
                        (missingPhone ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            No phone column picked
                          </span>
                        ) : (
                          phoneHeaders.length > 0 && (
                            <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-medium text-brand-green">
                              Phone: {phoneHeaders.join(", ")}
                            </span>
                          )
                        ))}
                      {state.included && sheet.headers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => ({ ...prev, [key]: !isOpen }))}
                          className="ml-auto text-xs font-medium text-brand-green hover:underline"
                        >
                          {isOpen ? "Hide columns" : "Edit columns"}
                        </button>
                      )}
                    </div>

                    {isOpen && (
                      <CustomerSheetPanel
                        sheet={sheet}
                        roles={state.roles}
                        extraColumns={extraColumnsFor(key)}
                        extraColumnsSelected={state.extraColumnsSelected}
                        onRoleChange={(colIndex, role) => onRoleChange(key, colIndex, role)}
                        onExtraColumnToggle={(colIndex, included) =>
                          onExtraColumnToggle(key, colIndex, included)
                        }
                        showRowCount={false}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          ← Back
        </Button>
        <Button disabled={!canRun || loading} onClick={onRun}>
          {includedCount > 1 ? `Clean ${includedCount} sheets together →` : "Run scrub →"}
        </Button>
      </div>
    </div>
  );
}
