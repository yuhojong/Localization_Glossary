export type GlossaryEntry = {
  id: string;
  fileName: string;
  sheetName: string;
  rowNo: number;
  key: string;
  source: string;
  ko: string;
  en: string;
  koNormalized: string;
  enNormalized: string;
  isTermCandidate: boolean;
};

export type GlossaryResult = {
  id: string;
  primaryText: string;
  primaryNormalized: string;
  representativeText: string;
  entryCount: number;
  distinctVariantCount: number;
  hasConflict: boolean;
  conflictLabel: string;
  isTermCandidate: boolean;
  entries: GlossaryEntry[];
  mode: "ko" | "en";
  matchRank?: number;
};

export type GlossaryStatus = {
  dataDir: string;
  entryCount: number;
  koResultCount: number;
  enResultCount: number;
  fileCount: number;
  lastIndexedAt: string | null;
  lastError: string | null;
};

export type SearchOptions = {
  mode: "ko" | "en";
  includeSentences: boolean;
  conflictsOnly: boolean;
};
