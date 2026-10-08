"use client";

import Dropzone from "./Dropzone";
import CountryCodeSelect from "./CountryCodeSelect";
import ColumnMapper, { ColumnRole } from "./ColumnMapper";
import Button from "./Button";
import type { ParsedFile } from "@/lib/types";
import { OPT_OUT_SHEET_NAME_PATTERN } from "@/lib/columnDetect";

export function sheetKey(fileId: string, sheetName: string) {
  return `${fileId}::${sheetName}`;
}

interface OptOutStepProps {
  stepNumber: number;
  files: ParsedFile[];
  roles: Record<string, Record<number, ColumnRole>>;
  included: Record<string, boolean>;
  defaultCountryCode: string;
  onDefaultCountryCodeChange: (value: string) => void;
  onFiles: (files: File[]) => void;
  onRoleChange: (key: string, colIndex: number, role: ColumnRole) => void;
  onIncludedChange: (key: string, included: boolean) => void;
  onRemoveFile: (fileId: string) => void;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
  loading: boolean;
  error: string | null;
}

export default function OptOutStep({
  stepNumber,
  files,
  roles,
  included,
  defaultCountryCode,
  onDefaultCountryCodeChange,
  onFiles,
  onRoleChange,
  onIncludedChange,
  onRemoveFile,
  onBack,
  onContinue,
  canContinue,
  loading,
  error,
}: OptOutStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          {stepNumber}. Upload your opt-out / do-not-contact list
        </h2>
        <p className="mt-2 text-base text-zinc-500">
          One or more spreadsheets or CSVs of people who must not be contacted.
          A single file can have multiple sheets (e.g. &ldquo;Opt Out&rdquo;,
          &ldquo;RSVP&rdquo;, &ldquo;Unsubscribed&rdquo;) — pick which ones
          count below.
        </p>
      </div>

      <CountryCodeSelect
        id="cc"
        value={defaultCountryCode}
        onChange={onDefaultCountryCodeChange}
      />

      <Dropzone
        label="Drop opt-out file(s) here"
        helpText="You can add more than one file — they'll all be merged into one opt-out set."
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
            <Button
              variant="danger"
              className="px-3 py-1 text-xs"
              onClick={() => onRemoveFile(file.id)}
            >
              Remove file
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-4">
            {file.sheets.map((sheet) => {
              const key = sheetKey(file.id, sheet.name);
              const isIncluded = included[key] ?? false;
              const looksLikeOptOut = OPT_OUT_SHEET_NAME_PATTERN.test(
                sheet.name,
              );
              return (
                <div
                  key={key}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3.5"
                >
                  <label className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-800">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-green"
                      checked={isIncluded}
                      onChange={(e) => onIncludedChange(key, e.target.checked)}
                    />
                    Sheet: {sheet.name}
                    {looksLikeOptOut && (
                      <span className="rounded-full bg-brand-green/10 px-2.5 py-0.5 text-xs font-medium text-brand-green">
                        looks like an opt-out sheet
                      </span>
                    )}
                    <span className="ml-auto text-xs font-normal text-zinc-400">
                      {sheet.rows.length} rows
                    </span>
                  </label>

                  {isIncluded && (
                    <div className="mt-3">
                      {sheet.headers.length === 0 ? (
                        <p className="text-sm text-zinc-400">
                          This sheet appears to be empty.
                        </p>
                      ) : (
                        <ColumnMapper
                          headers={sheet.headers}
                          sampleRow={sheet.rows[0]}
                          roles={roles[key] ?? {}}
                          onChange={(colIndex, role) =>
                            onRoleChange(key, colIndex, role)
                          }
                        />
                      )}
                    </div>
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
        <Button disabled={!canContinue || loading} onClick={onContinue}>
          Continue to customer database →
        </Button>
      </div>
    </div>
  );
}
