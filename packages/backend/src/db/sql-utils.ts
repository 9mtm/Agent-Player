/**
 * SQL Security Utilities
 * Validation helpers to prevent SQL injection
 */

/**
 * SECURITY: Validate SQL table name to prevent SQL injection
 * @param tableName Table name from sqlite_master or user input
 * @returns Sanitized table name
 * @throws Error if table name is invalid
 */
export function validateTableName(tableName: string): string {
  // Only allow alphanumeric characters and underscores
  const validPattern = /^[a-zA-Z0-9_]+$/;

  if (!tableName || !validPattern.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  // Additional check: reject if starts with sqlite_ (system tables)
  if (tableName.toLowerCase().startsWith('sqlite_')) {
    throw new Error(`Cannot access system table: ${tableName}`);
  }

  return tableName;
}

/**
 * SECURITY: Validate SQL column name to prevent SQL injection
 * @param columnName Column name from request or user input
 * @param allowedColumns Optional whitelist of allowed column names
 * @returns Sanitized column name
 * @throws Error if column name is invalid
 */
export function validateColumnName(
  columnName: string,
  allowedColumns?: string[]
): string {
  // Only allow alphanumeric characters and underscores
  const validPattern = /^[a-zA-Z0-9_]+$/;

  if (!columnName || !validPattern.test(columnName)) {
    throw new Error(`Invalid column name: ${columnName}`);
  }

  // If whitelist provided, check against it
  if (allowedColumns && !allowedColumns.includes(columnName)) {
    throw new Error(`Column not allowed: ${columnName}`);
  }

  return columnName;
}

/**
 * SECURITY: Validate SQL ORDER BY direction
 * @param direction Sort direction (ASC or DESC)
 * @returns Validated direction
 * @throws Error if direction is invalid
 */
export function validateSortDirection(direction: string): 'ASC' | 'DESC' {
  const normalized = direction.toUpperCase();

  if (normalized !== 'ASC' && normalized !== 'DESC') {
    throw new Error(`Invalid sort direction: ${direction}. Must be ASC or DESC.`);
  }

  return normalized as 'ASC' | 'DESC';
}

/**
 * SECURITY: Build safe WHERE clause from key-value pairs
 * @param conditions Object with column names as keys
 * @param allowedColumns Whitelist of allowed column names
 * @returns Object with SQL clause and parameter values
 */
export function buildSafeWhereClause(
  conditions: Record<string, any>,
  allowedColumns: string[]
): { clause: string; values: any[] } {
  const clauses: string[] = [];
  const values: any[] = [];

  for (const [column, value] of Object.entries(conditions)) {
    // Validate column name against whitelist
    validateColumnName(column, allowedColumns);
    clauses.push(`${column} = ?`);
    values.push(value);
  }

  return {
    clause: clauses.length > 0 ? clauses.join(' AND ') : '1=1',
    values
  };
}

/**
 * SECURITY: Build safe UPDATE SET clause from key-value pairs
 * @param updates Object with column names as keys
 * @param allowedColumns Whitelist of allowed column names
 * @returns Object with SQL clause and parameter values
 */
export function buildSafeUpdateClause(
  updates: Record<string, any>,
  allowedColumns: string[]
): { clause: string; values: any[] } {
  const clauses: string[] = [];
  const values: any[] = [];

  for (const [column, value] of Object.entries(updates)) {
    // Skip undefined values
    if (value === undefined) continue;

    // Validate column name against whitelist
    validateColumnName(column, allowedColumns);
    clauses.push(`${column} = ?`);
    values.push(value);
  }

  if (clauses.length === 0) {
    throw new Error('No valid columns to update');
  }

  return {
    clause: clauses.join(', '),
    values
  };
}
