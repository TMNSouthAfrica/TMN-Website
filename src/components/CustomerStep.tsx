"use client";

import Dropzone from "./Dropzone";
import type { ColumnRole } from "./ColumnMapper";
import Button from "./Button";
import CustomerSheetPanel from "./CustomerSheetPanel";
import type { ParsedFile } from "@/lib/types";

interface CustomerStepProps {
  stepNumber: number;
  showOptOutCopy: boolean;
  file: ParsedFile | null;
  selectedSheetName: string | null;
  roles: Record<number, ColumnRole>;
  extraColumns: { index: number; header: string; fieldName: string }[];
  extraColumnsSelected: Record<number, boolean>;
  onFile: (files: File[]) => void;
  onSheetChange: (name: string) => void;
  onRoleChange: (colIndex: number, role: ColumnRole) => void;
  onExtraColumnToggle: (colIndex: number, included: boolean) => void;
  onBack: () => void;
  onRun: () => void;
  canRun: boolean;
  loading: boolean;
  error: string | null;
}

export default function CustomerStep({
  stepNumber,
  showOptOutCopy,
  file,
  selectedSheetName,
  roles,
  extraColumns,
  extraColumnsSelected,
  onFile,
  onSheetChange,
  onRoleChange,
  onExtraColumnToggle,
  onBack,
  onRun,
  canRun,
  loading,
  error,
}: CustomerStepProps) {
  const sheet = file?.sheets.find((s) => s.name === selectedSheetName) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          {stepNumber}. Upload the customer database to clean
        </h2>
        <p className="mt-2 text-base text-zinc-500">
          {showOptOutCopy
            ? "This is the contact list that needs opt-outs removed before use. Nothing here is modified in your opt-out file — it’s read-only reference data."
            : "This is the contact list to format and dedupe for your broadcast."}
        </p>
      </div>

      <Dropzone
        label={
          file
            ? `Replace "${file.fileName}"`
            : "Drop the customer database here"
        }
        helpText="A single spreadsheet or CSV. If it has multiple sheets, you'll pick which one below."
        onFiles={onFile}
        disabled={loading}
      />

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {file && (
        <div className="animate-fade-up rounded-2xl border border-zinc-100 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-zinc-800">{file.fileName}</h3>
            {file.sheets.length > 1 && (
              <label className="flex items-center gap-2 text-sm">
                Sheet:
                <select
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-brand-green/50 focus:outline-none"
                  value={selectedSheetName ?? ""}
                  onChange={(e) => onSheetChange(e.target.value)}
                >
                  {file.sheets.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.rows.length} rows)
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {sheet && (
            <CustomerSheetPanel
              sheet={sheet}
              roles={roles}
              extraColumns={extraColumns}
              extraColumnsSelected={extraColumnsSelected}
              onRoleChange={onRoleChange}
              onExtraColumnToggle={onExtraColumnToggle}
            />
          )}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          ← Back
        </Button>
        <Button disabled={!canRun || loading} onClick={onRun}>
          Run scrub →
        </Button>
      </div>
    </div>
  );
}
