import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ColumnInfo, DatabaseInfo, QueryResult } from "./types";
import "./App.css";

function App() {
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [sql, setSql] = useState("SELECT 1;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearError = () => {
    setError(null);
  };

  const openDatabase = useCallback(async () => {
    clearError();
    const selected = await open({
      multiple: false,
      filters: [{ name: "SQLite", extensions: ["db", "sqlite", "sqlite3"] }],
    });
    if (!selected || typeof selected !== "string") return;

    setLoading(true);
    try {
      const info = await invoke<DatabaseInfo>("open_database", { path: selected });
      setDbPath(info.path);
      setTables(info.tables);
      setSelectedTable(null);
      setColumns([]);
      setSql("SELECT 1;");
      setResult(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const selectTable = useCallback(async (table: string) => {
    clearError();
    setSelectedTable(table);
    setSql(`SELECT * FROM "${table.replace(/"/g, '""')}" LIMIT 100;`);
    setLoading(true);
    try {
      const info = await invoke<ColumnInfo[]>("get_table_info", { table });
      setColumns(info);
      setResult(null);
    } catch (e) {
      setError(String(e));
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const runQuery = useCallback(async () => {
    if (!dbPath) {
      setError("먼저 데이터베이스 파일을 여세요.");
      return;
    }
    clearError();
    setLoading(true);
    try {
      const data = await invoke<QueryResult>("execute_query", { sql });
      setResult(data);
    } catch (e) {
      setResult(null);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [dbPath, sql]);

  const closeDatabase = useCallback(async () => {
    clearError();
    try {
      await invoke("close_database");
    } catch (e) {
      setError(String(e));
      return;
    }
    setDbPath(null);
    setTables([]);
    setSelectedTable(null);
    setColumns([]);
    setSql("SELECT 1;");
    setResult(null);
  }, []);

  return (
    <div className="app">
      <header className="toolbar">
        <h1>SQLite Desktop</h1>
        <div className="toolbar-actions">
          <button type="button" onClick={openDatabase} disabled={loading}>
            DB 열기
          </button>
          {dbPath && (
            <button type="button" onClick={closeDatabase} disabled={loading} className="secondary">
              닫기
            </button>
          )}
        </div>
        {dbPath && (
          <p className="db-path" title={dbPath}>
            {dbPath}
          </p>
        )}
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="workspace">
        <aside className="sidebar">
          <h2>테이블</h2>
          {!dbPath && <p className="hint">DB 파일을 열면 테이블 목록이 표시됩니다.</p>}
          <ul className="table-list">
            {tables.map((table) => (
              <li key={table}>
                <button
                  type="button"
                  className={selectedTable === table ? "active" : ""}
                  onClick={() => selectTable(table)}
                  disabled={loading}
                >
                  {table}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="main">
          {selectedTable && columns.length > 0 && (
            <section className="schema-panel">
              <h2>{selectedTable} 스키마</h2>
              <table className="schema-table">
                <thead>
                  <tr>
                    <th>컬럼</th>
                    <th>타입</th>
                    <th>NOT NULL</th>
                    <th>PK</th>
                    <th>기본값</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col) => (
                    <tr key={col.cid}>
                      <td>{col.name}</td>
                      <td>{col.type_name || "—"}</td>
                      <td>{col.notnull ? "Y" : ""}</td>
                      <td>{col.pk ? "Y" : ""}</td>
                      <td>{col.default_value ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="query-panel">
            <div className="query-header">
              <h2>SQL (SELECT)</h2>
              <button type="button" onClick={runQuery} disabled={loading || !dbPath}>
                실행
              </button>
            </div>
            <textarea
              value={sql}
              onChange={(event) => {
                setSql(event.target.value);
              }}
              spellCheck={false}
              rows={6}
              placeholder="SELECT * FROM table_name LIMIT 100;"
            />
          </section>

          {result && (
            <section className="result-panel">
              <h2>
                결과 <span className="row-count">({result.rows.length}행)</span>
              </h2>
              <div className="result-scroll">
                <table className="result-table">
                  <thead>
                    <tr>
                      {result.columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{formatCell(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function formatCell(value: QueryResult["rows"][number][number]): string {
  if (value === null) return "NULL";
  return String(value);
}

export default App;
