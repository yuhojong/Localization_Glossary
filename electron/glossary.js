const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

function normalizeKo(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!?()[\]{}"'`~]/g, "")
    .trim();
}

function normalizeEn(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!?()[\]{}"'`~]/g, "")
    .toLowerCase()
    .trim();
}

function isTermCandidate(value) {
  const text = String(value || "").trim();
  if (!text) {
    return false;
  }

  const tokens = text.split(/\s+/).filter(Boolean).length;
  const punctuation = /[.!?]/.test(text);
  const hasLongTail = text.length > 22;

  return !punctuation && tokens <= 4 && !hasLongTail;
}

function compareByScore(a, b) {
  if (a.matchRank !== b.matchRank) {
    return a.matchRank - b.matchRank;
  }

  if (a.isTermCandidate !== b.isTermCandidate) {
    return a.isTermCandidate ? -1 : 1;
  }

  if (a.hasConflict !== b.hasConflict) {
    return a.hasConflict ? -1 : 1;
  }

  return a.primaryText.localeCompare(b.primaryText, "ko");
}

class GlossaryStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.entries = [];
    this.koAggregates = [];
    this.enAggregates = [];
    this.lastIndexedAt = null;
    this.lastError = null;
    this.fileCount = 0;
  }

  setDataDir(nextDir) {
    this.dataDir = nextDir;
  }

  getStatus() {
    return {
      dataDir: this.dataDir,
      entryCount: this.entries.length,
      koResultCount: this.koAggregates.length,
      enResultCount: this.enAggregates.length,
      fileCount: this.fileCount,
      lastIndexedAt: this.lastIndexedAt,
      lastError: this.lastError
    };
  }

  async reindex() {
    this.entries = [];
    this.koAggregates = [];
    this.enAggregates = [];
    this.fileCount = 0;
    this.lastError = null;

    if (!fs.existsSync(this.dataDir)) {
      this.lastError = `Data directory not found: ${this.dataDir}`;
      this.lastIndexedAt = new Date().toISOString();
      return;
    }

    const files = fs
      .readdirSync(this.dataDir)
      .filter((fileName) => fileName.toLowerCase().endsWith(".xlsx"))
      .sort((a, b) => a.localeCompare(b, "ko"));

    this.fileCount = files.length;

    for (const fileName of files) {
      const fullPath = path.join(this.dataDir, fileName);
      this.indexWorkbook(fullPath, fileName);
    }

    this.rebuildAggregates();
    this.lastIndexedAt = new Date().toISOString();
  }

  indexWorkbook(fullPath, fileName) {
    const workbook = XLSX.readFile(fullPath, { cellDates: false });

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        blankrows: false,
        raw: false
      });

      if (!rows.length) {
        continue;
      }

      const header = rows[0].map((value) => String(value || "").trim());
      if (
        header[0] !== "Key" ||
        header[1] !== "Source" ||
        header[2] !== "KO" ||
        header[3] !== "EN"
      ) {
        continue;
      }

      for (let index = 1; index < rows.length; index += 1) {
        const row = rows[index];
        const key = row[0] == null ? "" : String(row[0]).trim();
        const source = row[1] == null ? "" : String(row[1]).trim();
        const ko = row[2] == null ? "" : String(row[2]).trim();
        const en = row[3] == null ? "" : String(row[3]).trim();

        if (!ko || !en) {
          continue;
        }

        this.entries.push({
          id: `${fileName}:${sheetName}:${index + 1}`,
          fileName,
          sheetName,
          rowNo: index + 1,
          key,
          source,
          ko,
          en,
          koNormalized: normalizeKo(ko),
          enNormalized: normalizeEn(en),
          isTermCandidate: isTermCandidate(ko)
        });
      }
    }
  }

  rebuildAggregates() {
    const koGrouped = new Map();
    const enGrouped = new Map();

    for (const entry of this.entries) {
      const koGroupKey = entry.koNormalized;

      if (!koGrouped.has(koGroupKey)) {
        koGrouped.set(koGroupKey, {
          ko: entry.ko,
          koNormalized: entry.koNormalized,
          isTermCandidate: entry.isTermCandidate,
          entries: [],
          enSet: new Set()
        });
      }

      const koGroup = koGrouped.get(koGroupKey);
      koGroup.entries.push(entry);
      koGroup.enSet.add(entry.en);
      koGroup.isTermCandidate = koGroup.isTermCandidate || entry.isTermCandidate;

      const enGroupKey = entry.enNormalized;

      if (!enGrouped.has(enGroupKey)) {
        enGrouped.set(enGroupKey, {
          en: entry.en,
          enNormalized: entry.enNormalized,
          entries: [],
          koSet: new Set(),
          isTermCandidate: entry.isTermCandidate
        });
      }

      const enGroup = enGrouped.get(enGroupKey);
      enGroup.entries.push(entry);
      enGroup.koSet.add(entry.ko);
      enGroup.isTermCandidate = enGroup.isTermCandidate || entry.isTermCandidate;
    }

    this.koAggregates = Array.from(koGrouped.values()).map((group) => ({
      id: `ko:${group.koNormalized}`,
      primaryText: group.ko,
      primaryNormalized: group.koNormalized,
      representativeText: group.entries[0].en,
      entryCount: group.entries.length,
      distinctVariantCount: group.enSet.size,
      hasConflict: group.enSet.size > 1,
      conflictLabel: "EN 충돌",
      isTermCandidate: group.isTermCandidate,
      entries: group.entries,
      mode: "ko"
    }));

    this.enAggregates = Array.from(enGrouped.values()).map((group) => ({
      id: `en:${group.enNormalized}`,
      primaryText: group.en,
      primaryNormalized: group.enNormalized,
      representativeText: group.entries[0].ko,
      entryCount: group.entries.length,
      distinctVariantCount: group.koSet.size,
      hasConflict: group.koSet.size > 1,
      conflictLabel: "KO 충돌",
      isTermCandidate: group.isTermCandidate,
      entries: group.entries,
      mode: "en"
    }));

    this.koAggregates.sort((a, b) => a.primaryText.localeCompare(b.primaryText, "ko"));
    this.enAggregates.sort((a, b) => a.primaryText.localeCompare(b.primaryText, "en"));
  }

  search(query, options = {}) {
    const mode = options.mode === "en" ? "en" : "ko";
    const normalized = mode === "en" ? normalizeEn(query) : normalizeKo(query);
    const includeSentences = Boolean(options.includeSentences);
    const conflictsOnly = Boolean(options.conflictsOnly);

    let results = mode === "en" ? this.enAggregates : this.koAggregates;

    if (!includeSentences) {
      results = results.filter((item) => item.isTermCandidate);
    }

    if (conflictsOnly) {
      results = results.filter((item) => item.hasConflict);
    }

    if (!normalized) {
      return results.slice(0, 200);
    }

    return results
      .filter((item) => item.primaryNormalized.includes(normalized))
      .map((item) => ({
        ...item,
        matchRank: this.getMatchRank(item.primaryNormalized, normalized)
      }))
      .sort(compareByScore)
      .slice(0, 200);
  }

  getMatchRank(target, query) {
    if (target === query) {
      return 0;
    }

    if (target.startsWith(query)) {
      return 1;
    }

    return 2;
  }
}

module.exports = {
  GlossaryStore
};
