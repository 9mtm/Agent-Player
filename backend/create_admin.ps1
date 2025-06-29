# PowerShell script to create admin user
# Requires: SQLite

# Ensure data directory exists
if (-not (Test-Path "data")) {
    New-Item -ItemType Directory -Path "data"
}

# Create SQLite database if it doesn't exist
if (-not (Test-Path "data/database.db")) {
    Write-Host "Creating new database..."
    sqlite3 "data/database.db" ".databases"
}

# Create users table if it doesn't exist
$createTable = @"
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"@

Write-Host "Creating users table..."
sqlite3 "data/database.db" $createTable

# Check if admin exists
$checkAdmin = "SELECT COUNT(*) FROM users WHERE email = 'me@alarade.at';"
$adminExists = sqlite3 "data/database.db" $checkAdmin

if ($adminExists -eq "0") {
    # Create admin user with bcrypt hashed password
    $createAdmin = @"
    INSERT INTO users (
        email, username, full_name, password_hash, role, 
        is_active, created_at, updated_at
    ) VALUES (
        'me@alarade.at',
        'admin',
        'Admin User',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyBAQ/fzL0tpam',
        'admin',
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );
"@
    
    Write-Host "Creating admin user..."
    sqlite3 "data/database.db" $createAdmin
    Write-Host "✅ Admin user created successfully!"
    Write-Host "Email: me@alarade.at"
    Write-Host "Password: admin123456"
} else {
    Write-Host "✅ Admin user already exists!"
}

# Print all users
Write-Host "`nAll users in database:"
sqlite3 "data/database.db" "SELECT id, email, role FROM users;" 