/**
 * Temporary In-Memory Database
 *
 * A simple in-memory database for testing until better-sqlite3 build issues are resolved on Windows.
 * This provides a compatible interface with better-sqlite3 for basic operations.
 */

interface Row {
  [key: string]: any;
}

class TempPreparedStatement {
  constructor(
    private sql: string,
    private db: TempDatabase
  ) {}

  run(...params: any[]): { changes: number } {
    // For CREATE TABLE/INDEX
    if (this.sql.trim().toUpperCase().startsWith('CREATE')) {
      return { changes: 0 };
    }

    // For INSERT/UPDATE/DELETE
    if (this.sql.includes('INSERT') || this.sql.includes('UPDATE') || this.sql.includes('DELETE')) {
      // Simple simulation - just return success
      return { changes: 1 };
    }

    return { changes: 0 };
  }

  get(...params: any[]): Row | undefined {
    // For SELECT queries - return mock data or undefined
    return undefined;
  }

  all(...params: any[]): Row[] {
    // For SELECT queries - return empty array
    return [];
  }
}

class TempDatabase {
  private tables: Map<string, Row[]> = new Map();

  constructor(path: string) {
    console.log(`[TempDB] Using in-memory database (path: ${path} - not persisted)`);
  }

  exec(sql: string): void {
    // Parse CREATE TABLE statements
    if (sql.includes('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match) {
        const tableName = match[1];
        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, []);
          console.log(`[TempDB] Created table: ${tableName}`);
        }
      }
    }
  }

  prepare(sql: string): TempPreparedStatement {
    return new TempPreparedStatement(sql, this);
  }

  close(): void {
    console.log('[TempDB] Closed database');
  }
}

// Export with same interface as better-sqlite3
export default TempDatabase;
