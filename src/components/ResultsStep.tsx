"use client";

import { useState } from "react";
import type { ParsedFile, ScrubResult, ScrubSummary } from "@/lib/types";
import type { CanonicalOutput } from "@/lib/canonicalOutput";
import Button from "./Button";
import {
  buildCsvBlob,
  buildRemovedContactsCsvBlob,
  buildXlsxBlob,
  cleanedFileName,
  downloadBlob,
} from "@/lib/exportFile";

/** One cleaned sheet. A combined basic-cleaning run has several. */
export interface ResultSource {
  file: ParsedFile;
  sheetName: string;
  label: string;
  summary: ScrubSummary;
}

interface ResultsStepProps {
  stepNumber: number;
  cleaningType: "basic" | "optout";
  result: ScrubResult;
  canonicalOutput: CanonicalOutput;
  sources: ResultSource[];
  onBack: () => void;
  onRestart: () => void;
}

type AccentColor = "zinc" | "orange" | "green" | "navy" | "red";

const ACCENT_STYLES: Record<AccentColor, string> = {
  zinc: "bg-zinc-400",
  orange: "bg-brand-orange",
  green: "bg-brand-green",
  navy: "bg-brand-navy",
  red: "bg-red-400",
};

function StatCard({
  label,
  value,
  accent = "zinc",
}: {
  label: string;
  value: number | string;
  accent?: AccentColor;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
      <span
        className={`absolute top-0 left-0 h-1 w-full ${ACCENT_STYLES[accent]}`}
      />
      <p className="text-3xl font-bold tabular-nums text-zinc-900">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}

export default function ResultsStep({
  stepNumber,
  cleaningType,
  result,
  canonicalOutput,
  sources,
  onBack,
  onRestart,
}: ResultsStepProps) {
  const [showRemoved, setShowRemoved] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { summary } = result;
  const combined = sources.length > 1;
  const { file: customerFile, sheetName: customerSheetName } = sources[0];

  function downloadCleaned() {
    setDownloadError(null);
    try {
      if (combined) {
        // Several files/sheets always come out as one combined CSV.
        const blob = buildCsvBlob(canonicalOutput.headers, canonicalOutput.rows, ",");
        downloadBlob(blob, "combined_cleaned.csv");
        return;
      }
      const name = cleanedFileName(customerFile.fileName);
      if (customerFile.format === "csv") {
        const blob = buildCsvBlob(
          canonicalOutput.headers,
          canonicalOutput.rows,
          customerFile.delimiter || ",",
        );
        downloadBlob(blob, name);
      } else {
        const blob = buildXlsxBlob(
          customerFile.workbook,
          customerSheetName,
          canonicalOutput.headers,
          canonicalOutput.rows,
        );
        downloadBlob(blob, name);
      }
    } catch (e) {
      setDownloadError(
        `Could not build the cleaned file: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  function downloadRemovedContacts() {
    setDownloadError(null);
    try {
      const base = combined ? "combined" : customerFile.fileName.replace(/\.[^.]+$/, "");
      const blob = buildRemovedContactsCsvBlob(result.removedContacts);
      downloadBlob(blob, `${base}_removed_contacts.csv`);
    } catch (e) {
      setDownloadError(
        `Could not build the removed-contacts file: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          {stepNumber}. Summary
        </h2>
        {combined && (
          <p className="mt-2 text-base text-zinc-500">
            <strong className="text-zinc-700">{sources.length} sheets</strong> were cleaned
            together into one combined CSV. Duplicates were removed across all of them.
          </p>
        )}
        <p className="mt-2 text-base text-zinc-500">
          Assumed default country code{" "}
          <strong className="text-zinc-700">
            +{summary.defaultCountryCode}
          </strong>{" "}
          for any number with a leading 0.
        </p>
        <p className="mt-1 text-base text-zinc-500">
          Cleaned file is exported as{" "}
          <strong className="text-zinc-700">
            Name, CountryCode, Phone, ContactStatus, AllowCampaign, AllowSMS
          </strong>
          {canonicalOutput.extraHeaders.length > 0 && (
            <>
              , plus{" "}
              <strong className="text-zinc-700">
                {canonicalOutput.extraHeaders.join(", ")}
              </strong>
            </>
          )}
          . AllowCampaign and AllowSMS are always set to &ldquo;TRUE&rdquo; for every
          contact in the cleaned file.
          {!canonicalOutput.foundInSource.contactStatus && (
            <>
              {" "}
              No ContactStatus column found in the source — defaulted to
              &ldquo;VALID&rdquo;.
            </>
          )}
        </p>
      </div>

      {downloadError && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Download failed:</strong> {downloadError} If this keeps
          happening, check whether your browser or an extension (ad blocker /
          download manager) is blocking automatic downloads for this site, then
          try again.
        </div>
      )}

      {!summary.consistent && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Discrepancy detected:</strong> original rows (
          {summary.totalOriginalRows}) does not equal removed (
          {summary.rowsRemoved}) + remaining ({summary.rowsRemaining}). Please
          re-check your column selections before using this file.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label={combined ? "Rows across all sheets" : "Rows in original file"}
          value={summary.totalOriginalRows}
        />
        <StatCard
          label="Invalid numbers removed"
          value={summary.invalidRowsRemoved}
          accent="red"
        />
        <StatCard
          label="Duplicates removed"
          value={summary.duplicateRowsRemoved}
          accent="orange"
        />
        {cleaningType === "optout" && (
          <>
            <StatCard
              label="Unique opt-out numbers"
              value={summary.totalUniqueOptOutNumbers}
              accent="orange"
            />
            <StatCard
              label="Opted-out contacts removed"
              value={summary.optOutRowsRemoved}
              accent="orange"
            />
          </>
        )}
        <StatCard
          label="Rows removed (total)"
          value={summary.rowsRemoved}
          accent="orange"
        />
        <StatCard
          label="Rows remaining"
          value={summary.rowsRemaining}
          accent="green"
        />
      </div>

      {combined && (
        <div className="max-h-96 overflow-auto rounded-2xl border border-zinc-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-50">
              <tr>
                {[
                  "Sheet",
                  "Rows",
                  "Invalid",
                  "Duplicates",
                  ...(cleaningType === "optout" ? ["Opt-outs"] : []),
                  "Kept",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-2.5 text-xs font-semibold tracking-wide text-zinc-400 uppercase ${i === 0 ? "text-left" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sources.map((s) => (
                <tr key={`${s.file.id}::${s.sheetName}`}>
                  <td className="px-4 py-2.5 font-medium text-zinc-700">{s.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.summary.totalOriginalRows}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.summary.invalidRowsRemoved}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{s.summary.duplicateRowsRemoved}</td>
                  {cleaningType === "optout" && (
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.summary.optOutRowsRemoved}</td>
                  )}
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-brand-green">
                    {s.summary.rowsRemaining}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={downloadCleaned} disabled={!summary.consistent}>
          {combined ? "Download combined cleaned file" : "Download cleaned file"}
        </Button>
        <Button
          variant="secondary"
          onClick={downloadRemovedContacts}
          disabled={result.removedContacts.length === 0}
        >
          Download removed-contacts list
        </Button>
        <Button variant="ghost" onClick={() => setShowRemoved((v) => !v)}>
          {showRemoved ? "Hide" : "Preview"} removed contacts (
          {result.removedContacts.length})
        </Button>
      </div>

      {showRemoved && (
        <div className="max-h-80 overflow-auto rounded-2xl border border-zinc-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  Matched phone
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  Reason
                </th>
                {combined && (
                  <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    Sheet
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {result.removedContacts.map((c, i) => (
                <tr key={i} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-2.5">
                    {c.name || <span className="text-zinc-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-zinc-600">
                    {c.phone || <span className="text-zinc-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.reason === "opt-out"
                          ? "bg-brand-orange/10 text-brand-orange"
                          : c.reason === "invalid"
                            ? "bg-red-50 text-red-600"
                            : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {c.reason === "opt-out"
                        ? "Opt-out"
                        : c.reason === "invalid"
                          ? "Invalid number"
                          : "Duplicate"}
                    </span>
                  </td>
                  {combined && <td className="px-4 py-2.5 text-zinc-500">{c.source}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          ← Adjust columns
        </Button>
        <Button variant="secondary" onClick={onRestart}>
          Start a new scrub
        </Button>
      </div>
    </div>
  );
}
