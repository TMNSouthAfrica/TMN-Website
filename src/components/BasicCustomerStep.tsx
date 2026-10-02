"use client";

import Dropzone from "./Dropzone";
import type { ColumnRole } from "./ColumnMapper";
import Button from "./Button";
import CustomerSheetPanel, { type ExtraColumn } from "./CustomerSheetPanel";
import { sheetKey } from "./OptOutStep";
import type { ParsedFile } from "@/lib/types";

export interface BasicSheetState {
  included: boolean;
  roles: Record<number, ColumnRole>;
  extraColumnsSelected: Record<number, boolean>;
}

interface BasicCustomerStepProps {
  stepNumber: number;
  files: ParsedFile[];
  sheets: Record<string, BasicSheetState>;
  extraColumnsFor: (key: string) => ExtraColumn[];
  onFiles: (files: File[]) => void;
  onIncludedChange: (key: string, included: boolean) => void;
  onRoleChange: (key: string, colIndex: number, role: ColumnRole) => void;
  onExtraColumnToggle: (key: string, colIndex: number, included: boolean) => void;
  onRemoveFile: (fileId: string) => void;
  onBack: () => void;
  onRun: () => void;
  canRun: boolean;
  includedCount: number;
  loading: boolean;
  error: string | null;
}

/**
 * Basic-cleaning customer upload: any number of files, and any number of
 * sheets from each, all cleaned together into one combined file.
 */
export default function BasicCustomerStep({
  stepNumber,
  files,
  sheets,
  extraColumnsFor,
  onFiles,
  onIncludedChange,
  onRoleChange,
  onExtraColumnToggle,
  onRemoveFile,
  onBack,
  onRun,
  canRun,
  includedCount,
  loading,
  error,
}: BasicCustomerStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          {stepNumber}. Upload the customer database(s) to clean
        </h2>
        <p className="mt-2 text-base text-zinc-500">
          Add one or more files and tick every sheet you want included. They&rsquo;re all
          formatted and deduped together into one combined file for your broadcast — a
          number that appears in more than one sheet is only kept once.
        </p>
      </div>

      <Dropzone
        label={files.length > 0 ? "Drop more customer files here" : "Drop the customer database(s) here"}
        helpText="You can add more than one file. If a file has multiple sheets, tick which ones to include below."
        multiple
        onFiles={onFiles}
        disabled={loading}
      />

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {files.map((file) => (
        <div
          key={file.id}
          className="animate-fade-up rounded-2xl border border-zinc-100 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-800">{file.fileName}</h3>
            <button
              type="button"
              onClick={() => onRemoveFile(file.id)}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Remove file
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-4">
            {file.sheets.map((sheet) => {
              const key = sheetKey(file.id, sheet.name);
              const state = sheets[key];
              if (!state) return null;
              const missingPhone =
                state.included &&
                sheet.headers.length > 0 &&
                !Object.values(state.roles).includes("phone");
              return (
                <div
                  key={key}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5"
                >
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-green"
                      checked={state.included}
                      onChange={(e) => onIncludedChange(key, e.target.checked)}
                    />
                    Sheet: {sheet.name}
                    <span className="ml-auto text-xs font-normal text-zinc-400">
                      {sheet.rows.length} rows
                    </span>
                  </label>

                  {state.included && (
                    <CustomerSheetPanel
                      sheet={sheet}
                      roles={state.roles}
                      extraColumns={extraColumnsFor(key)}
                      extraColumnsSelected={state.extraColumnsSelected}
                      showRowCount={false}
                      onRoleChange={(colIndex, role) => onRoleChange(key, colIndex, role)}
                      onExtraColumnToggle={(colIndex, included) =>
                        onExtraColumnToggle(key, colIndex, included)
                      }
                    />
                  )}
                  {missingPhone && (
                    <p className="mt-2 text-xs text-amber-600">
                      Pick at least one phone number column for this sheet, or untick it.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

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
