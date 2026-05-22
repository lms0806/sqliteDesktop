export interface DatabaseInfo {
  path: string;
  tables: string[];
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type_name: string;
  notnull: boolean;
  default_value: string | null;
  pk: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: (string | number | boolean | null)[][];
}
