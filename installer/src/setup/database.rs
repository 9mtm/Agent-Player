use rusqlite::{Connection, Result};
use bcrypt::{hash, DEFAULT_COST};
use uuid::Uuid;
use std::path::Path;

/// Initialize a fresh database with the admin user
pub fn initialize_database(db_path: &Path, admin_name: &str, admin_email: &str, admin_password: &str) -> Result<(), String> {
    // Remove existing database if it exists
    if db_path.exists() {
        std::fs::remove_file(db_path)
            .map_err(|e| format!("Failed to remove existing database: {}", e))?;
    }

    // Create new database
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to create database: {}", e))?;

    // Create users table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin',
            status TEXT NOT NULL DEFAULT 'active',
            email_verified INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    ).map_err(|e| format!("Failed to create users table: {}", e))?;

    // Hash the admin password
    let password_hash = hash(admin_password, DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {}", e))?;

    // Generate UUID for admin user
    let user_id = Uuid::new_v4().to_string();

    // Insert admin user
    conn.execute(
        "INSERT INTO users (id, full_name, email, password_hash, role, status, email_verified)
         VALUES (?1, ?2, ?3, ?4, 'admin', 'active', 1)",
        [&user_id, admin_name, admin_email, &password_hash],
    ).map_err(|e| format!("Failed to create admin user: {}", e))?;

    Ok(())
}

/// Test database connection
pub fn test_database(db_path: &Path) -> Result<bool, String> {
    if !db_path.exists() {
        return Ok(false);
    }

    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // Check if users table exists and has at least one user
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM users",
        [],
        |row| row.get(0),
    ).map_err(|e| format!("Failed to query users: {}", e))?;

    Ok(count > 0)
}
