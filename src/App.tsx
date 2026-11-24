import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ColumnInfo, DatabaseInfo, QueryResult } from "./types";

const primaryButtonClass =
  "cursor-pointer rounded-md bg-[#4a7cff] px-[14px] py-1.5 text-[0.9rem] text-white enabled:hover:bg-[#3d6ae8] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "cursor-pointer rounded-md bg-[#3a3f4b] px-[14px] py-1.5 text-[0.9rem] text-white enabled:hover:bg-[#4a505c] disabled:cursor-not-allowed disabled:opacity-50";
const sectionTitleClass = "mb-2 text-[0.95rem]";
const tableClass = "w-full border-collapse text-[0.85rem]";
const tableHeaderCellClass =
  "border border-[#3a3f4b] bg-[#2e323a] px-2.5 py-1.5 text-left font-semibold";
const tableCellClass =
  "border border-[#3a3f4b] bg-[#252830] px-2.5 py-1.5 text-left";

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
    <div className="flex h-screen flex-col bg-[#1a1d23] font-['Segoe_UI',system-ui,sans-serif] text-sm leading-normal text-[#e8eaed]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#3a3f4b] bg-[#252830] px-4 py-3">
        <h1 className="text-[1.1rem] font-semibold">SQLite Desktop</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openDatabase}
            disabled={loading}
            className={primaryButtonClass}
          >
            DB 열기
          </button>
          {dbPath && (
            <button
              type="button"
              onClick={closeDatabase}
              disabled={loading}
              className={secondaryButtonClass}
            >
              닫기
            </button>
          )}
        </div>
        {dbPath && (
          <p
            className="min-w-0 flex-1 truncate text-[0.85rem] text-[#9aa0a6]"
            title={dbPath}
          >
            {dbPath}
          </p>
        )}
      </header>

      {error && (
        <div className="border-b border-[#7a3a3a] bg-[#5c2a2a] px-4 py-2.5 text-[#ffb4b4]">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="w-[220px] shrink-0 overflow-y-auto border-r border-[#3a3f4b] bg-[#22252c] p-3">
          <h2 className="mb-2.5 text-[0.85rem] font-semibold tracking-[0.05em] text-[#9aa0a6] uppercase">
            테이블
          </h2>
          {!dbPath && (
            <p className="text-[0.85rem] text-[#6b7280]">
              DB 파일을 열면 테이블 목록이 표시됩니다.
            </p>
          )}
          <ul className="m-0 list-none p-0">
            {tables.map((table) => (
              <li key={table} className="mb-1">
                <button
                  type="button"
                  className={`w-full cursor-pointer rounded-md px-2.5 py-2 text-left text-[#c8ccd2] enabled:hover:bg-[#2e323a] disabled:cursor-not-allowed disabled:opacity-50 ${
                    selectedTable === table
                      ? "bg-[#353b47] text-white"
                      : "bg-transparent"
                  }`}
                  onClick={() => selectTable(table)}
                  disabled={loading}
                >
                  {table}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {selectedTable && columns.length > 0 && (
            <section>
              <h2 className={sectionTitleClass}>{selectedTable} 스키마</h2>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={tableHeaderCellClass}>컬럼</th>
                    <th className={tableHeaderCellClass}>타입</th>
                    <th className={tableHeaderCellClass}>NOT NULL</th>
                    <th className={tableHeaderCellClass}>PK</th>
                    <th className={tableHeaderCellClass}>기본값</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col) => (
                    <tr key={col.cid}>
                      <td className={tableCellClass}>{col.name}</td>
                      <td className={tableCellClass}>{col.type_name || "—"}</td>
                      <td className={tableCellClass}>{col.notnull ? "Y" : ""}</td>
                      <td className={tableCellClass}>{col.pk ? "Y" : ""}</td>
                      <td className={tableCellClass}>{col.default_value ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[0.95rem]">SQL (SELECT)</h2>
              <button
                type="button"
                onClick={runQuery}
                disabled={loading || !dbPath}
                className={primaryButtonClass}
              >
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
              className="w-full resize-y rounded-md border border-[#3a3f4b] bg-[#252830] px-3 py-2.5 font-['Cascadia_Code','Consolas',monospace] text-[0.9rem] text-[#e8eaed] outline-none focus:outline-2 focus:outline-[#4a7cff]"
            />
          </section>

          {result && (
            <section>
              <h2 className={sectionTitleClass}>
                결과{" "}
                <span className="text-[0.85rem] font-normal text-[#9aa0a6]">
                  ({result.rows.length}행)
                </span>
              </h2>
              <div className="max-h-[360px] overflow-auto rounded-md border border-[#3a3f4b]">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      {result.columns.map((col) => (
                        <th key={col} className={tableHeaderCellClass}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className={`${tableCellClass} max-w-[280px] truncate whitespace-nowrap`}
                          >
                            {formatCell(cell)}
                          </td>
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
