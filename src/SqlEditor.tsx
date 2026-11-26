import { useMemo } from "react";
import { sql as sqlLanguage, SQLite } from "@codemirror/lang-sql";
import { EditorView, keymap } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import type { ColumnInfo } from "./types";

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  tables: string[];
  selectedTable: string | null;
  columns: ColumnInfo[];
}

function SqlEditor({
  value,
  onChange,
  onRun,
  tables,
  selectedTable,
  columns,
}: SqlEditorProps) {
  const extensions = useMemo(() => {
    const schema = Object.fromEntries(
      tables.map((table) => [
        table,
        table === selectedTable
          ? columns.map((column) => ({
              label: column.name,
              type: "property",
              detail: column.type_name || undefined,
            }))
          : [],
      ]),
    );

    return [
      sqlLanguage({
        dialect: SQLite,
        schema,
        upperCaseKeywords: true,
      }),
      keymap.of([
        {
          key: "Ctrl-Enter",
          run: () => {
            onRun();
            return true;
          },
        },
      ]),
      EditorView.theme(
        {
          "&": {
            backgroundColor: "#252830",
            color: "#e8eaed",
            fontFamily: '"Cascadia Code", Consolas, monospace',
            fontSize: "0.9rem",
          },
          ".cm-scroller, .cm-content, .cm-line": {
            backgroundColor: "#252830",
          },
          ".cm-content": { caretColor: "#e8eaed", padding: "10px 0" },
          ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#e8eaed" },
          ".cm-gutters": {
            backgroundColor: "#22252c",
            borderRight: "1px solid #3a3f4b",
            color: "#9aa0a6",
          },
          ".cm-activeLine": { backgroundColor: "#2e323a" },
          ".cm-activeLineGutter": { backgroundColor: "#2e323a" },
          ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
            backgroundColor: "#4a7cff66",
          },
          ".cm-tooltip-autocomplete": {
            backgroundColor: "#252830",
            border: "1px solid #3a3f4b",
            color: "#e8eaed",
          },
          ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
            backgroundColor: "#353b47",
            color: "#ffffff",
          },
        },
        { dark: true },
      ),
    ];
  }, [columns, onRun, selectedTable, tables]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      autoFocus
      placeholder="SELECT * FROM table_name LIMIT 100;"
      extensions={extensions}
      basicSetup={{ lineNumbers: true }}
      theme="dark"
      minHeight="132px"
      className="overflow-hidden rounded-md border border-[#3a3f4b] focus-within:border-[#4a7cff] focus-within:ring-1 focus-within:ring-[#4a7cff]"
    />
  );
}

export default SqlEditor;
