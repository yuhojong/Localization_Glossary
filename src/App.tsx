import { useEffect, useState } from "react";
import type { GlossaryResult, GlossaryStatus, SearchOptions } from "./types";

const DEFAULT_STATUS: GlossaryStatus = {
  dataDir: "",
  entryCount: 0,
  koResultCount: 0,
  enResultCount: 0,
  fileCount: 0,
  appVersion: "",
  lastIndexedAt: null,
  lastError: null
};

const DEFAULT_OPTIONS: SearchOptions = {
  mode: "ko",
  includeSentences: false,
  conflictsOnly: false
};

function App() {
  const [status, setStatus] = useState<GlossaryStatus>(DEFAULT_STATUS);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchOptions>(DEFAULT_OPTIONS);
  const [results, setResults] = useState<GlossaryResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadInitialState();
  }, []);

  useEffect(() => {
    void runSearch();
  }, [query, options.includeSentences, options.conflictsOnly]);

  async function loadInitialState() {
    setLoading(true);

    try {
      const nextStatus = await window.glossaryApi.getStatus();
      setStatus(nextStatus);
      const initialResults = await window.glossaryApi.search("", options);
      setResults(initialResults);
      setSelectedId(initialResults[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function runSearch() {
    const nextResults = await window.glossaryApi.search(query, options);
    setResults(nextResults);
    setSelectedId((current) =>
      nextResults.some((item) => item.id === current) ? current : nextResults[0]?.id ?? null
    );
  }

  async function handleReindex() {
    setBusy(true);

    try {
      const nextStatus = await window.glossaryApi.reindex();
      setStatus(nextStatus);
      await runSearch();
    } finally {
      setBusy(false);
    }
  }

  async function handlePickDirectory() {
    setBusy(true);

    try {
      const nextStatus = await window.glossaryApi.selectDirectory();
      setStatus(nextStatus);
      await runSearch();
    } finally {
      setBusy(false);
    }
  }

  const selected = results.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">StudioNavi Glossary Search</p>
          <h1>Navi Localization Glossary</h1>
          <p className="local-name">스튜디오나비 글로서리</p>
          <p className="version-text">
            Version {status.appVersion || "-"}
          </p>
        </div>
        <div className="actions">
          <button onClick={handlePickDirectory} disabled={busy}>
            폴더 선택
          </button>
          <button onClick={handleReindex} disabled={busy}>
            {busy ? "재색인 중..." : "재색인"}
          </button>
        </div>
      </header>

      <section className="status-panel">
        <div>
          <span className="label">데이터 폴더</span>
          <strong>{status.dataDir || "-"}</strong>
        </div>
        <div>
          <span className="label">파일 수</span>
          <strong>{status.fileCount}</strong>
        </div>
        <div>
          <span className="label">엔트리 수</span>
          <strong>{status.entryCount}</strong>
        </div>
        <div>
          <span className="label">KO 용어 수</span>
          <strong>{status.koResultCount}</strong>
        </div>
        <div>
          <span className="label">EN 용어 수</span>
          <strong>{status.enResultCount}</strong>
        </div>
      </section>

      {status.lastError ? <div className="error-banner">{status.lastError}</div> : null}

      <section className="search-panel">
        <div className="tab-group">
          <button
            className={options.mode === "ko" ? "tab-button active" : "tab-button"}
            onClick={() =>
              setOptions((current) => ({
                ...current,
                mode: "ko"
              }))
            }
          >
            KO 검색
          </button>
          <button
            className={options.mode === "en" ? "tab-button active" : "tab-button"}
            onClick={() =>
              setOptions((current) => ({
                ...current,
                mode: "en"
              }))
            }
          >
            EN 검색
          </button>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            options.mode === "ko"
              ? "한글 용어를 검색하세요"
              : "영문 용어를 검색하세요"
          }
        />
        <label>
          <input
            type="checkbox"
            checked={options.includeSentences}
            onChange={(event) =>
              setOptions((current) => ({
                ...current,
                includeSentences: event.target.checked
              }))
            }
          />
          전체 보기
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.conflictsOnly}
            onChange={(event) =>
              setOptions((current) => ({
                ...current,
                conflictsOnly: event.target.checked
              }))
            }
          />
          충돌만 보기
        </label>
      </section>

      <main className="content-grid">
        <section className="result-list">
          {loading ? <div className="empty-state">색인 상태를 불러오는 중입니다.</div> : null}

          {!loading && results.length === 0 ? (
            <div className="empty-state">조건에 맞는 결과가 없습니다.</div>
          ) : null}

          {results.map((item) => (
            <button
              key={item.id}
              className={`result-card ${item.id === selectedId ? "selected" : ""}`}
              onClick={() => setSelectedId(item.id)}
            >
              <div className="result-card-header">
                <strong>{item.primaryText}</strong>
                {item.hasConflict ? (
                  <span className="badge conflict">{item.conflictLabel}</span>
                ) : null}
              </div>
              <p>{item.representativeText}</p>
              <div className="meta-row">
                <span>{item.entryCount} rows</span>
                <span>{item.distinctVariantCount} variants</span>
              </div>
            </button>
          ))}
        </section>

        <section className="detail-panel">
          {!selected ? (
            <div className="empty-state">좌측에서 용어를 선택하면 상세가 표시됩니다.</div>
          ) : (
            <>
              <div className="detail-header">
                <div>
                  <p className="eyebrow">Selected Term</p>
                  <h2>{selected.primaryText}</h2>
                </div>
                {selected.hasConflict ? (
                  <span className="badge conflict">{selected.conflictLabel}</span>
                ) : null}
              </div>

              <div className="detail-summary">
                <div>
                  <span className="label">
                    {selected.mode === "ko" ? "대표 EN" : "대표 KO"}
                  </span>
                  <strong>{selected.representativeText}</strong>
                </div>
                <div>
                  <span className="label">
                    {selected.mode === "ko" ? "변형 EN 수" : "변형 KO 수"}
                  </span>
                  <strong>{selected.distinctVariantCount}</strong>
                </div>
                <div>
                  <span className="label">총 행 수</span>
                  <strong>{selected.entryCount}</strong>
                </div>
              </div>

              <div className="entry-table">
                <div className="entry-row entry-head">
                  <span>{selected.mode === "ko" ? "EN" : "KO"}</span>
                  <span>Key</span>
                  <span>Source</span>
                  <span>File</span>
                </div>
                {selected.entries.map((entry) => (
                  <div key={entry.id} className="entry-row">
                    <span>{selected.mode === "ko" ? entry.en : entry.ko}</span>
                    <span>{entry.key || "-"}</span>
                    <span>{entry.source || "-"}</span>
                    <span>
                      {entry.fileName} / {entry.sheetName} / {entry.rowNo}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
