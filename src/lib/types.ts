export type FileFormat = "csv" | "xlsx" | "xls";

/**
 * "basic" = format + dedupe only, no opt-out list involved.
 * "optout" = dedupe + remove opt-out matches, then format.
 */
export type CleaningType = "basic" | "optout";

export type RemovalReason = "duplicate" | "opt-out" | "invalid" | "excluded-country";

export interface ParsedSheet {
  /** Sheet/tab name. CSV files get a single synthetic sheet named "Sheet1". */
  name: string;
  headers: string[];
  /** Data rows, excluding the header row. Each row is aligned to `headers`. */
  rows: string[][];
}

export interface ParsedFile {
  id: string;
  fileName: string;
  format: FileFormat;
  /** CSV/TSV only — the delimiter detected in the source file, preserved on export. */
  delimiter?: string;
  sheets: ParsedSheet[];
  /**
   * For xlsx/xls files: the original workbook, kept so we can export the
   * cleaned data back into the same workbook (preserving any other sheets)
   * rather than starting from scratch.
   */
  workbook?: unknown;
}

export interface ColumnDetection {
  /** Indexes into `headers` that look like phone number columns. */
  phoneCandidates: number[];
  /** Index of a likely separate country/dial code column, if any. */
  countryCodeCandidate: number | null;
  /** Index of a likely contact-name column, if any. */
  nameCandidate: number | null;
}

export interface OptOutSheetConfig {
  fileId: string;
  fileName: string;
  sheetName: string;
  included: boolean;
  phoneColIndexes: number[];
  countryCodeColIndex: number | null;
}

export interface CustomerSheetConfig {
  phoneColIndexes: number[];
  countryCodeColIndex: number | null;
  nameColIndex: number | null;
}

export interface ScrubSummary {
  totalOriginalRows: number;
  totalUniqueOptOutNumbers: number;
  uniqueMatchedContactsRemoved: number;
  /** Rows removed because their phone number had already appeared earlier in the file. */
  duplicateRowsRemoved: number;
  /** Rows removed because they matched the opt-out set (0 for basic cleaning). */
  optOutRowsRemoved: number;
  /** Rows removed because none of their phone numbers were valid (missing, too short/long, or a repeated-digit placeholder). */
  invalidRowsRemoved: number;
  /** Rows removed because every valid number on them is from a country the user excluded. */
  excludedCountryRowsRemoved: number;
  rowsRemoved: number;
  rowsRemaining: number;
  consistent: boolean;
  defaultCountryCode: string;
}

export interface RemovedContact {
  name: string;
  phone: string;
  reason: RemovalReason;
  /** Which file/sheet the row came from — only set when several sheets were cleaned together. */
  source?: string;
}

export interface ScrubResult {
  headers: string[];
  keptRows: string[][];
  removedRows: string[][];
  removedContacts: RemovedContact[];
  summary: ScrubSummary;
}
