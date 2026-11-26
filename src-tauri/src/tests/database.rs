use rusqlite::Connection;
use serde_json::json;

use crate::{is_read_only_sql, list_tables_inner, quote_identifier, value_to_json};

#[test]
fn quote_identifier_escapes_embedded_quotes() {
    assert_eq!(quote_identifier("order"), "\"order\"");
    assert_eq!(quote_identifier("customer\"name"), "\"customer\"\"name\"");
}

#[test]
fn list_tables_excludes_sqlite_internal_tables_and_sorts_names() -> rusqlite::Result<()> {
    let connection = Connection::open_in_memory()?;
    connection.execute_batch(
        "
        CREATE TABLE zebra (id INTEGER PRIMARY KEY);
        CREATE TABLE alpha (id INTEGER PRIMARY KEY);
        ",
    )?;

    assert_eq!(
        list_tables_inner(&connection),
        Ok(vec!["alpha".to_string(), "zebra".to_string()])
    );

    Ok(())
}

#[test]
fn value_to_json_preserves_sqlite_value_types() -> rusqlite::Result<()> {
    let connection = Connection::open_in_memory()?;
    let mut statement = connection.prepare("SELECT NULL, 42, 1.5, 'SQLite', x'0102'")?;
    let values = statement.query_row([], |row| {
        Ok((0..5)
            .map(|index| value_to_json(row, index))
            .collect::<Vec<_>>())
    })?;

    assert_eq!(
        values,
        vec![
            Ok(serde_json::Value::Null),
            Ok(json!(42)),
            Ok(json!(1.5)),
            Ok(json!("SQLite")),
            Ok(json!("<BLOB 2 bytes>")),
        ]
    );

    Ok(())
}

#[test]
fn read_only_sql_allows_supported_query_prefixes_and_rejects_writes() {
    for sql in [
        "SELECT * FROM users",
        "WITH names AS (SELECT name FROM users) SELECT * FROM names",
        "PRAGMA table_info(users)",
        "EXPLAIN QUERY PLAN SELECT * FROM users",
    ] {
        assert!(is_read_only_sql(sql), "expected query to be allowed: {sql}");
    }

    for sql in [
        "",
        "   ",
        "INSERT INTO users VALUES (1)",
        "DELETE FROM users",
    ] {
        assert!(
            !is_read_only_sql(sql),
            "expected query to be rejected: {sql}"
        );
    }
}
