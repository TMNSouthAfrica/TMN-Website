"use client";

import { useMemo, useState } from "react";
import StepIndicator from "@/components/StepIndicator";
import Logo from "@/components/Logo";
import CleaningTypeStep from "@/components/CleaningTypeStep";
import OptOutStep, { sheetKey } from "@/components/OptOutStep";
import CustomerStep from "@/components/CustomerStep";
import BasicCustomerStep, { type BasicSheetState } from "@/components/BasicCustomerStep";
import type { ExtraColumn } from "@/components/CustomerSheetPanel";
import ResultsStep, { type ResultSource } from "@/components/ResultsStep";
import type { ColumnRole } from "@/components/ColumnMapper";
import { parseUploadedFile } from "@/lib/parseFile";
import {
  detectColumns,
  detectPassthroughColumns,
  OPT_OUT_SHEET_NAME_PATTERN,
  toFieldName,
} from "@/lib/columnDetect";
import { buildOptOutSet, combineScrubResults, scrubCustomerSheet } from "@/lib/scrub";
import {
  buildCanonicalOutput,
  combineCanonicalOutputs,
  type CanonicalOutput,
} from "@/lib/canonicalOutput";
import type {
  CleaningType,
  CustomerSheetConfig,
  OptOutSheetConfig,
  ParsedFile,
  ParsedSheet,
  ScrubResult,
} from "@/lib/types";

type RolesMap = Record<number, ColumnRole>;

function rolesFromDetection(headers: string[]): RolesMap {
  const detection = detectColumns(headers);
  const roles: RolesMap = {};
  detection.phoneCandidates.forEach((i) => (roles[i] = "phone"));
  if (detection.countryCodeCandidate !== null) roles[detection.countryCodeCandidate] = "countrycode";
  if (detection.nameCandidate !== null && !(detection.nameCandidate in roles)) {
    roles[detection.nameCandidate] = "name";
  }
  return roles;
}

function rolesToConfig(roles: RolesMap): {
  phoneColIndexes: number[];
  countryCodeColIndex: number | null;
  nameColIndex: number | null;
} {
  const phoneColIndexes: number[] = [];
  let countryCodeColIndex: number | null = null;
  let nameColIndex: number | null = null;
  for (const [idxStr, role] of Object.entries(roles)) {
    const idx = Number(idxStr);
    if (role === "phone") phoneColIndexes.push(idx);
    if (role === "countrycode") countryCodeColIndex = idx;
    if (role === "name") nameColIndex = idx;
  }
  phoneColIndexes.sort((a, b) => a - b);
  return { phoneColIndexes, countryCodeColIndex, nameColIndex };
}

/**
 * Source columns not already used by the canonical schema (phone/country/name,
 * or a ContactStatus/AllowCampaign/AllowSMS passthrough match) — the user picks
 * which of these, if any, to carry into the output alongside the standard fields.
 */
function extraColumnCandidatesFor(sheet: ParsedSheet, config: CustomerSheetConfig): ExtraColumn[] {
  const passthrough = detectPassthroughColumns(sheet.headers);
  const usedIndexes = new Set<number>([
    ...config.phoneColIndexes,
    ...(config.countryCodeColIndex !== null ? [config.countryCodeColIndex] : []),
    ...(config.nameColIndex !== null ? [config.nameColIndex] : []),
    ...(passthrough.contactStatusIndex !== null ? [passthrough.contactStatusIndex] : []),
    ...(passthrough.allowCampaignIndex !== null ? [passthrough.allowCampaignIndex] : []),
    ...(passthrough.allowSmsIndex !== null ? [passthrough.allowSmsIndex] : []),
  ]);
  return sheet.headers
    .map((header, index) => ({ index, header, fieldName: toFieldName(header) }))
    .filter(({ index }) => !usedIndexes.has(index));
}

/** Applies a role change, keeping country code and name to a single column each. */
function withRole(roles: RolesMap, colIndex: number, role: ColumnRole): RolesMap {
  const next = { ...roles };
  if (role === "countrycode" || role === "name") {
    for (const k of Object.keys(next)) {
      if (next[Number(k)] === role) delete next[Number(k)];
    }
  }
  next[colIndex] = role;
  return next;
}

const STEPS_BASIC = ["Cleaning type", "Customer database", "Summary"];
const STEPS_OPTOUT = ["Cleaning type", "Opt-out list", "Customer database", "Summary"];

export default function Home() {
  const [step, setStep] = useState(0);
  const [cleaningType, setCleaningType] = useState<CleaningType | null>(null);
  const [defaultCountryCode, setDefaultCountryCode] = useState("27");

  // --- Opt-out state ---
  const [optOutFiles, setOptOutFiles] = useState<ParsedFile[]>([]);
  const [optOutRoles, setOptOutRoles] = useState<Record<string, RolesMap>>({});
  const [optOutIncluded, setOptOutIncluded] = useState<Record<string, boolean>>({});
  const [optOutLoading, setOptOutLoading] = useState(false);
  const [optOutError, setOptOutError] = useState<string | null>(null);

  // --- Customer state ---
  const [customerFile, setCustomerFile] = useState<ParsedFile | null>(null);
  const [customerSheetName, setCustomerSheetName] = useState<string | null>(null);
  const [customerRoles, setCustomerRoles] = useState<RolesMap>({});
  const [extraColumnsSelected, setExtraColumnsSelected] = useState<Record<number, boolean>>({});
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // --- Basic-cleaning customer state (several files / sheets, combined) ---
  const [basicFiles, setBasicFiles] = useState<ParsedFile[]>([]);
  const [basicSheets, setBasicSheets] = useState<Record<string, BasicSheetState>>({});

  const [result, setResult] = useState<ScrubResult | null>(null);
  const [resultSources, setResultSources] = useState<ResultSource[]>([]);
  const [canonicalOutput, setCanonicalOutput] = useState<CanonicalOutput | null>(null);

  async function handleOptOutFiles(files: File[]) {
    setOptOutLoading(true);
    setOptOutError(null);
    try {
      const parsed = await Promise.all(files.map(parseUploadedFile));
      setOptOutFiles((prev) => [...prev, ...parsed]);
      setOptOutRoles((prev) => {
        const next = { ...prev };
        for (const file of parsed) {
          for (const sheet of file.sheets) {
            next[sheetKey(file.id, sheet.name)] = rolesFromDetection(sheet.headers);
          }
        }
        return next;
      });
      setOptOutIncluded((prev) => {
        const next = { ...prev };
        for (const file of parsed) {
          const singleSheet = file.sheets.length === 1;
          for (const sheet of file.sheets) {
            next[sheetKey(file.id, sheet.name)] =
              singleSheet || OPT_OUT_SHEET_NAME_PATTERN.test(sheet.name);
          }
        }
        return next;
      });
    } catch (e) {
      setOptOutError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setOptOutLoading(false);
    }
  }

  function handleOptOutRoleChange(key: string, colIndex: number, role: ColumnRole) {
    setOptOutRoles((prev) => {
      const sheetRoles = { ...(prev[key] ?? {}) };
      if (role === "countrycode") {
        for (const k of Object.keys(sheetRoles)) {
          if (sheetRoles[Number(k)] === "countrycode") delete sheetRoles[Number(k)];
        }
      }
      sheetRoles[colIndex] = role;
      return { ...prev, [key]: sheetRoles };
    });
  }

  function handleOptOutIncludedChange(key: string, included: boolean) {
    setOptOutIncluded((prev) => ({ ...prev, [key]: included }));
  }

  function handleRemoveOptOutFile(fileId: string) {
    setOptOutFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  const optOutSources = useMemo(() => {
    const sources: { config: OptOutSheetConfig; sheet: ParsedSheet; fileName: string }[] = [];
    for (const file of optOutFiles) {
      for (const sheet of file.sheets) {
        const key = sheetKey(file.id, sheet.name);
        if (!optOutIncluded[key]) continue;
        const { phoneColIndexes, countryCodeColIndex } = rolesToConfig(optOutRoles[key] ?? {});
        sources.push({
          fileName: file.fileName,
          sheet,
          config: {
            fileId: file.id,
            fileName: file.fileName,
            sheetName: sheet.name,
            included: true,
            phoneColIndexes,
            countryCodeColIndex,
          },
        });
      }
    }
    return sources;
  }, [optOutFiles, optOutIncluded, optOutRoles]);

  const canContinueFromOptOut =
    optOutSources.length > 0 && optOutSources.every((s) => s.config.phoneColIndexes.length > 0);

  async function handleCustomerFile(files: File[]) {
    const file = files[0];
    if (!file) return;
    setCustomerLoading(true);
    setCustomerError(null);
    try {
      const parsed = await parseUploadedFile(file);
      const withData = parsed.sheets.filter((s) => s.headers.length > 0);
      const chosen = (withData.length > 0 ? withData : parsed.sheets).reduce((best, s) =>
        s.rows.length > best.rows.length ? s : best,
      );
      setCustomerFile(parsed);
      setCustomerSheetName(chosen.name);
      setCustomerRoles(rolesFromDetection(chosen.headers));
      setExtraColumnsSelected({});
    } catch (e) {
      setCustomerError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setCustomerLoading(false);
    }
  }

  function handleCustomerSheetChange(name: string) {
    setCustomerSheetName(name);
    const sheet = customerFile?.sheets.find((s) => s.name === name);
    setCustomerRoles(rolesFromDetection(sheet?.headers ?? []));
    setExtraColumnsSelected({});
  }

  function handleExtraColumnToggle(colIndex: number, included: boolean) {
    setExtraColumnsSelected((prev) => ({ ...prev, [colIndex]: included }));
  }

  function handleCustomerRoleChange(colIndex: number, role: ColumnRole) {
    setCustomerRoles((prev) => withRole(prev, colIndex, role));
  }

  async function handleBasicFiles(files: File[]) {
    if (files.length === 0) return;
    setCustomerLoading(true);
    setCustomerError(null);
    try {
      const parsed = await Promise.all(files.map(parseUploadedFile));
      setBasicFiles((prev) => [...prev, ...parsed]);
      setBasicSheets((prev) => {
        const next = { ...prev };
        for (const file of parsed) {
          for (const sheet of file.sheets) {
            next[sheetKey(file.id, sheet.name)] = {
              included: sheet.headers.length > 0 && sheet.rows.length > 0,
              roles: rolesFromDetection(sheet.headers),
              extraColumnsSelected: {},
            };
          }
        }
        return next;
      });
    } catch (e) {
      setCustomerError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setCustomerLoading(false);
    }
  }

  function updateBasicSheet(key: string, update: (state: BasicSheetState) => BasicSheetState) {
    setBasicSheets((prev) => (prev[key] ? { ...prev, [key]: update(prev[key]) } : prev));
  }

  function handleRemoveBasicFile(fileId: string) {
    setBasicFiles((prev) => prev.filter((f) => f.id !== fileId));
    setBasicSheets((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(`${fileId}::`))),
    );
  }

  const basicSources = useMemo(() => {
    const sources: {
      key: string;
      file: ParsedFile;
      sheet: ParsedSheet;
      config: CustomerSheetConfig;
      extraColumns: ExtraColumn[];
      extraColumnsSelected: Record<number, boolean>;
    }[] = [];
    for (const file of basicFiles) {
      for (const sheet of file.sheets) {
        const key = sheetKey(file.id, sheet.name);
        const state = basicSheets[key];
        if (!state?.included) continue;
        const config = rolesToConfig(state.roles);
        sources.push({
          key,
          file,
          sheet,
          config,
          extraColumns: extraColumnCandidatesFor(sheet, config),
          extraColumnsSelected: state.extraColumnsSelected,
        });
      }
    }
    return sources;
  }, [basicFiles, basicSheets]);

  function basicExtraColumnsFor(key: string): ExtraColumn[] {
    const found = basicSources.find((s) => s.key === key);
    return found ? found.extraColumns : [];
  }

  const canRunBasic =
    basicSources.length > 0 && basicSources.every((s) => s.config.phoneColIndexes.length > 0);

  const customerSheet = customerFile?.sheets.find((s) => s.name === customerSheetName) ?? null;
  const customerConfig: CustomerSheetConfig = useMemo(() => {
    const { phoneColIndexes, countryCodeColIndex, nameColIndex } = rolesToConfig(customerRoles);
    return { phoneColIndexes, countryCodeColIndex, nameColIndex };
  }, [customerRoles]);

  const canRun = !!customerSheet && customerConfig.phoneColIndexes.length > 0;

  const extraColumnCandidates = useMemo(
    () => (customerSheet ? extraColumnCandidatesFor(customerSheet, customerConfig) : []),
    [customerSheet, customerConfig],
  );

  const selectedExtraColumnIndexes = extraColumnCandidates
    .filter(({ index }) => extraColumnsSelected[index])
    .map(({ index }) => index);

  const STEPS = cleaningType === "optout" ? STEPS_OPTOUT : STEPS_BASIC;
  const optOutStepIndex = 1;
  const customerStepIndexFor = (type: CleaningType | null) => (type === "optout" ? 2 : 1);
  const summaryStepIndexFor = (type: CleaningType | null) => (type === "optout" ? 3 : 2);
  const customerStepIndex = customerStepIndexFor(cleaningType);
  const summaryStepIndex = summaryStepIndexFor(cleaningType);

  function sourceLabel(file: ParsedFile, sheetName: string) {
    return file.sheets.length > 1 ? `${file.fileName} — ${sheetName}` : file.fileName;
  }

  function runBasicScrub() {
    if (basicSources.length === 0) return;
    // One shared set so a number kept from an earlier sheet counts as a duplicate later on.
    const seenNumbers = new Set<string>();
    const parts = basicSources.map(({ file, sheet, config, extraColumns, extraColumnsSelected }) => {
      const scrubResult = scrubCustomerSheet(
        sheet,
        config,
        new Set<string>(),
        defaultCountryCode,
        seenNumbers,
      );
      const extraIndexes = extraColumns
        .filter(({ index }) => extraColumnsSelected[index])
        .map(({ index }) => index);
      return {
        file,
        sheetName: sheet.name,
        label: sourceLabel(file, sheet.name),
        result: scrubResult,
        canonical: buildCanonicalOutput(sheet, config, scrubResult.keptRows, defaultCountryCode, extraIndexes),
      };
    });

    if (parts.length === 1) {
      setResult(parts[0].result);
      setCanonicalOutput(parts[0].canonical);
    } else {
      setResult(combineScrubResults(parts));
      setCanonicalOutput(combineCanonicalOutputs(parts.map((p) => p.canonical)));
    }
    setResultSources(
      parts.map(({ file, sheetName, label, result }) => ({
        file,
        sheetName,
        label,
        summary: result.summary,
      })),
    );
    setStep(summaryStepIndex);
  }

  function runScrub() {
    if (!customerSheet || !customerFile || !customerSheetName) return;
    const optOutSet =
      cleaningType === "optout" ? buildOptOutSet(optOutSources, defaultCountryCode) : new Set<string>();
    const scrubResult = scrubCustomerSheet(customerSheet, customerConfig, optOutSet, defaultCountryCode);
    setResult(scrubResult);
    setResultSources([
      {
        file: customerFile,
        sheetName: customerSheetName,
        label: sourceLabel(customerFile, customerSheetName),
        summary: scrubResult.summary,
      },
    ]);
    setCanonicalOutput(
      buildCanonicalOutput(
        customerSheet,
        customerConfig,
        scrubResult.keptRows,
        defaultCountryCode,
        selectedExtraColumnIndexes,
      ),
    );
    setStep(summaryStepIndex);
  }

  function restart() {
    setCleaningType(null);
    setOptOutFiles([]);
    setOptOutRoles({});
    setOptOutIncluded({});
    setCustomerFile(null);
    setCustomerSheetName(null);
    setCustomerRoles({});
    setExtraColumnsSelected({});
    setBasicFiles([]);
    setBasicSheets({});
    setResult(null);
    setResultSources([]);
    setCanonicalOutput(null);
    setStep(0);
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
          <Logo />
          <span className="flex items-center gap-1.5 rounded-full bg-brand-green/10 px-3.5 py-1.5 text-sm font-semibold text-brand-green">
            Data Master <span aria-hidden="true">🫆</span>
          </span>
        </div>
        <div className="h-[3px] bg-gradient-to-r from-brand-green via-brand-mint to-brand-orange" />
      </header>

      <div className="dot-grid relative overflow-hidden bg-brand-navy pt-12 pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -left-24 h-80 w-80 rounded-full bg-brand-green/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-16 -right-20 h-72 w-72 rounded-full bg-brand-mint/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-brand-navy to-transparent"
        />
        <div className="relative mx-auto w-full max-w-6xl px-6 sm:px-8">
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-white sm:text-6xl">
            {cleaningType === "optout" ? (
              <>
                Opt-out list, <span className="text-brand-mint">scrubbed</span>.
              </>
            ) : (
              <>
                Broadcast-ready contacts, <span className="text-brand-mint">fast</span>.
              </>
            )}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-brand-mint/80 sm:text-xl">
            👉 No manual cross-checking. No guesswork.{" "}
            <span className="font-semibold text-white">Compliant contact lists that work.</span>
          </p>
          <div className="mt-10">
            <StepIndicator steps={STEPS} currentIndex={step} />
          </div>
        </div>
      </div>

      <main className="relative z-10 mx-auto -mt-14 w-full max-w-6xl flex-1 px-6 pb-16 sm:px-8">
        <div className="animate-fade-up rounded-3xl border border-zinc-100 bg-white p-8 shadow-2xl shadow-zinc-900/10 sm:p-10">
          {step === 0 && (
            <CleaningTypeStep
              stepNumber={1}
              onSelect={(type) => {
                setCleaningType(type);
                setStep(type === "optout" ? optOutStepIndex : customerStepIndexFor(type));
              }}
            />
          )}

          {cleaningType === "optout" && step === optOutStepIndex && (
            <OptOutStep
              stepNumber={2}
              files={optOutFiles}
              roles={optOutRoles}
              included={optOutIncluded}
              defaultCountryCode={defaultCountryCode}
              onDefaultCountryCodeChange={setDefaultCountryCode}
              onFiles={handleOptOutFiles}
              onRoleChange={handleOptOutRoleChange}
              onIncludedChange={handleOptOutIncludedChange}
              onRemoveFile={handleRemoveOptOutFile}
              onBack={() => setStep(0)}
              onContinue={() => setStep(customerStepIndex)}
              canContinue={canContinueFromOptOut}
              loading={optOutLoading}
              error={optOutError}
            />
          )}

          {cleaningType === "basic" && step === customerStepIndex && (
            <BasicCustomerStep
              stepNumber={2}
              files={basicFiles}
              sheets={basicSheets}
              extraColumnsFor={basicExtraColumnsFor}
              onFiles={handleBasicFiles}
              onIncludedChange={(key, included) =>
                updateBasicSheet(key, (state) => ({ ...state, included }))
              }
              onRoleChange={(key, colIndex, role) =>
                updateBasicSheet(key, (state) => ({
                  ...state,
                  roles: withRole(state.roles, colIndex, role),
                }))
              }
              onExtraColumnToggle={(key, colIndex, included) =>
                updateBasicSheet(key, (state) => ({
                  ...state,
                  extraColumnsSelected: { ...state.extraColumnsSelected, [colIndex]: included },
                }))
              }
              onRemoveFile={handleRemoveBasicFile}
              onBack={() => setStep(0)}
              onRun={runBasicScrub}
              canRun={canRunBasic}
              includedCount={basicSources.length}
              loading={customerLoading}
              error={customerError}
            />
          )}

          {cleaningType === "optout" && step === customerStepIndex && (
            <CustomerStep
              stepNumber={3}
              showOptOutCopy={cleaningType === "optout"}
              file={customerFile}
              selectedSheetName={customerSheetName}
              roles={customerRoles}
              extraColumns={extraColumnCandidates}
              extraColumnsSelected={extraColumnsSelected}
              onFile={handleCustomerFile}
              onSheetChange={handleCustomerSheetChange}
              onRoleChange={handleCustomerRoleChange}
              onExtraColumnToggle={handleExtraColumnToggle}
              onBack={() => setStep(cleaningType === "optout" ? optOutStepIndex : 0)}
              onRun={runScrub}
              canRun={canRun}
              loading={customerLoading}
              error={customerError}
            />
          )}

          {cleaningType &&
            step === summaryStepIndex &&
            result &&
            canonicalOutput &&
            resultSources.length > 0 && (
              <ResultsStep
                stepNumber={cleaningType === "optout" ? 4 : 3}
                cleaningType={cleaningType}
                result={result}
                canonicalOutput={canonicalOutput}
                sources={resultSources}
                onBack={() => setStep(customerStepIndex)}
                onRestart={restart}
              />
            )}
        </div>
        <p className="mt-6 text-center text-sm text-zinc-400">
          Files are processed entirely in your browser — nothing is uploaded to a server.
        </p>
      </main>

      <footer className="border-t border-white/5 bg-brand-navy py-14">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 text-center sm:px-8">
          <Logo variant="light" />
          <div className="mt-2 space-y-1.5 text-sm text-zinc-300">
            <p>
              📍 Block E, 2nd Floor Clearwater Corporate Office Park, North Cnr Atlas Rd,
              Merlin Dr, Parkhaven, Boksburg, 1459
            </p>
            <p>📞 +27 10 446 5788</p>
            <p>✉️ info@themessengernetwork.co.za</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
