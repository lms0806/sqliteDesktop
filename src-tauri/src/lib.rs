use rusqlite::{types::ValueRef, Connection, Row};
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

struct DbState(Mutex<Option<Connection>>);

#[derive(Serialize)]
struct DatabaseInfo {
    path: String,
    tables: Vec<String>,
}

#[derive(Serialize)]
struct ColumnInfo {
    cid: i64,
    name: String,
    type_name: String,
    notnull: bool,
    default_value: Option<String>,
    pk: bool,
}

#[derive(Serialize)]
struct QueryResult {
    columns: Vec<String>,
    rows: Vec<Vec<serde_json::Value>>,
}

fn with_connection<F, T>(state: &State<DbState>, f: F) -> Result<T, String>
where
    F: FnOnce(&Connection) -> Result<T, String>,
{
    let guard = state
        .0
        .lock()
        .map_err(|_| "데이터베이스 상태를 잠글 수 없습니다.".to_string())?;
    let conn = guard
        .as_ref()
        .ok_or_else(|| "데이터베이스가 열려 있지 않습니다. 파일을 먼저 여세요.".to_string())?;
    f(conn)
}

fn list_tables_inner(conn: &Connection) -> Result<Vec<String>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT name FROM sqlite_master \
             WHERE type = 'table' AND name NOT LIKE 'sqlite_%' \
             ORDER BY name",
        )
        .map_err(|e| e.to_string())?;

    let tables = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tables)
}

fn value_to_json(row: &Row, index: usize) -> Result<serde_json::Value, String> {
    match row.get_ref(index).map_err(|e| e.to_string())? {
        ValueRef::Null => Ok(serde_json::Value::Null),
        ValueRef::Integer(v) => Ok(serde_json::json!(v)),
        ValueRef::Real(v) => Ok(serde_json::json!(v)),
        ValueRef::Text(v) => Ok(serde_json::Value::String(
            String::from_utf8_lossy(v).into_owned(),
        )),
        ValueRef::Blob(v) => Ok(serde_json::Value::String(format!(
            "<BLOB {} bytes>",
            v.len()
        ))),
    }
}

fn is_read_only_sql(sql: &str) -> bool {
    let trimmed = sql.trim();
    if trimmed.is_empty() {
        return false;
    }
    let upper = trimmed.to_uppercase();
    upper.starts_with("SELECT")
        || upper.starts_with("PRAGMA")
        || upper.starts_with("WITH")
        || upper.starts_with("EXPLAIN")
}

#[tauri::command]
fn open_database(state: State<DbState>, path: String) -> Result<DatabaseInfo, String> {
    let conn = Connection::open(&path).map_err(|e| format!("DB 열기 실패: {e}"))?;
    let tables = list_tables_inner(&conn)?;

    let mut guard = state
        .0
        .lock()
        .map_err(|_| "데이터베이스 상태를 잠글 수 없습니다.".to_string())?;
    *guard = Some(conn);

    Ok(DatabaseInfo { path, tables })
}

#[tauri::command]
fn list_tables(state: State<DbState>) -> Result<Vec<String>, String> {
    with_connection(&state, list_tables_inner)
}

#[tauri::command]
fn get_table_info(state: State<DbState>, table: String) -> Result<Vec<ColumnInfo>, String> {
    with_connection(&state, |conn| {
    let tables = list_tables_inner(conn)?;
    if !tables.iter().any(|t| t == &table) {
        return Err(format!("테이블 '{table}'을(를) 찾을 수 없습니다."));
    }

    let sql = format!("PRAGMA table_info({})", quote_identifier(&table));
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let columns = stmt
        .query_map([], |row| {
            Ok(ColumnInfo {
                cid: row.get(0)?,
                name: row.get(1)?,
                type_name: row.get(2)?,
                notnull: row.get::<_, i64>(3)? != 0,
                default_value: row.get(4)?,
                pk: row.get::<_, i64>(5)? != 0,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(columns)
    })
}

fn quote_identifier(name: &str) -> String {
    format!("\"{}\"", name.replace('"', "\"\""))
}

#[tauri::command]
fn execute_query(state: State<DbState>, sql: String) -> Result<QueryResult, String> {
    if !is_read_only_sql(&sql) {
        return Err(
            "읽기 전용 쿼리만 실행할 수 있습니다. (SELECT, WITH, PRAGMA, EXPLAIN)".to_string(),
        );
    }

    with_connection(&state, |conn| {
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("쿼리 준비 실패: {e}"))?;
    let column_count = stmt.column_count();
    let columns: Vec<String> = (0..column_count)
        .map(|i| stmt.column_name(i).unwrap_or("").to_string())
        .collect();

    let mut rows = Vec::new();
    let mut rows_iter = stmt.query([]).map_err(|e| format!("쿼리 실행 실패: {e}"))?;

    while let Some(row) = rows_iter.next().map_err(|e| e.to_string())? {
        let mut values = Vec::with_capacity(column_count);
        for i in 0..column_count {
            values.push(value_to_json(row, i)?);
        }
        rows.push(values);
    }

    Ok(QueryResult { columns, rows })
    })
}

#[tauri::command]
fn close_database(state: State<DbState>) -> Result<(), String> {
    let mut guard = state
        .0
        .lock()
        .map_err(|_| "데이터베이스 상태를 잠글 수 없습니다.".to_string())?;
    *guard = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(DbState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            open_database,
            list_tables,
            get_table_info,
            execute_query,
            close_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
