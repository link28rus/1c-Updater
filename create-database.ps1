# Script to create PostgreSQL database

Write-Host "=== Creating PostgreSQL Database ===" -ForegroundColor Green

$dbName = "1c_updater"
$dbUser = "postgres"
$dbPassword = "admin"

Write-Host "`nTrying to create database using different methods..." -ForegroundColor Yellow

# Method 1: Try psql if in PATH
try {
    $env:PGPASSWORD = $dbPassword
    psql -U $dbUser -h localhost -c "CREATE DATABASE `"$dbName`";" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Database created successfully using psql!" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "psql not found in PATH" -ForegroundColor Yellow
}

# Method 2: Try to find PostgreSQL installation
$pgPaths = @(
    "C:\Program Files\PostgreSQL\*\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe"
)

foreach ($path in $pgPaths) {
    $psqlPath = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($psqlPath) {
        Write-Host "Found PostgreSQL at: $($psqlPath.FullName)" -ForegroundColor Green
        $env:PGPASSWORD = $dbPassword
        & $psqlPath.FullName -U $dbUser -h localhost -c "CREATE DATABASE `"$dbName`";"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database created successfully!" -ForegroundColor Green
            exit 0
        }
        break
    }
}

Write-Host "`nCould not create database automatically." -ForegroundColor Red
Write-Host "Please create it manually using one of these methods:" -ForegroundColor Yellow
Write-Host "`n1. Using pgAdmin:" -ForegroundColor White
Write-Host "   - Open pgAdmin" -ForegroundColor Gray
Write-Host "   - Right-click on 'Databases' -> Create -> Database" -ForegroundColor Gray
Write-Host "   - Name: 1c_updater" -ForegroundColor Gray
Write-Host "`n2. Using SQL command:" -ForegroundColor White
Write-Host "   CREATE DATABASE `"1c_updater`";" -ForegroundColor Gray
Write-Host "`n3. Using command line (if psql is in PATH):" -ForegroundColor White
Write-Host "   psql -U postgres -c `"CREATE DATABASE \`"1c_updater\`";`"" -ForegroundColor Gray




