# Setup script for 1C Updater System

Write-Host "=== Installing 1C Updater System ===" -ForegroundColor Green

# Check Node.js
Write-Host "`nChecking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check PostgreSQL
Write-Host "`nChecking PostgreSQL..." -ForegroundColor Yellow
try {
    $pgVersion = psql --version
    Write-Host "PostgreSQL found: $pgVersion" -ForegroundColor Green
} catch {
    Write-Host "WARNING: PostgreSQL not found in PATH" -ForegroundColor Yellow
    Write-Host "Make sure PostgreSQL is installed and database is created" -ForegroundColor Yellow
}

# Install Backend dependencies
Write-Host "`nInstalling Backend dependencies..." -ForegroundColor Yellow
Set-Location backend
if (Test-Path "node_modules") {
    Write-Host "Dependencies already installed, skipping..." -ForegroundColor Gray
} else {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR installing Backend dependencies!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}
Set-Location ..

# Install Frontend dependencies
Write-Host "`nInstalling Frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
if (Test-Path "node_modules") {
    Write-Host "Dependencies already installed, skipping..." -ForegroundColor Gray
} else {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR installing Frontend dependencies!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}
Set-Location ..

# Create directories
Write-Host "`nCreating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "backend\uploads\distributions" | Out-Null
Write-Host "Directories created" -ForegroundColor Green

# Check .env file
Write-Host "`nChecking configuration..." -ForegroundColor Yellow
if (Test-Path "backend\.env") {
    Write-Host ".env file found" -ForegroundColor Green
} else {
    Write-Host ".env file not found, creating from template" -ForegroundColor Yellow
    if (Test-Path "backend\.env.example") {
        Copy-Item "backend\.env.example" "backend\.env" -ErrorAction SilentlyContinue
    }
    Write-Host "IMPORTANT: Edit backend\.env and set correct database settings!" -ForegroundColor Red
}

Write-Host "`n=== Installation completed! ===" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Configure backend\.env file" -ForegroundColor White
Write-Host "2. Create PostgreSQL database: CREATE DATABASE 1c_updater;" -ForegroundColor White
Write-Host "3. Start Backend: npm run start:backend" -ForegroundColor White
Write-Host "4. Start Frontend: npm run start:frontend" -ForegroundColor White
Write-Host "5. Create first user: node backend\scripts\create-admin.js" -ForegroundColor White
