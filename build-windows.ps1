# Steno Windows Build Script (PowerShell)
# Improved version with better error handling and Unicode support

param(
    [switch]$Clean = $false,
    [switch]$Portable = $false,
    [switch]$Release = $true,
    [string]$Target = "x86_64-pc-windows-msvc"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Steno Windows Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if command exists
function Test-Command($command) {
    try {
        if (Get-Command $command -ErrorAction Stop) { return $true }
    }
    catch { return $false }
}

# Function to show progress
function Write-Progress-Custom($Activity, $Status) {
    Write-Host "[INFO] $Activity" -ForegroundColor Green
    if ($Status) {
        Write-Host "       $Status" -ForegroundColor Gray
    }
}

# Function to show error
function Write-Error-Custom($Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to show warning
function Write-Warning-Custom($Message) {
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

# Check prerequisites
Write-Progress-Custom "Checking prerequisites"

if (-not (Test-Command "node")) {
    Write-Error-Custom "Node.js is not installed or not in PATH"
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Command "cargo")) {
    Write-Error-Custom "Rust is not installed or not in PATH"
    Write-Host "Please install Rust from https://rustup.rs/" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Command "cmake")) {
    Write-Error-Custom "CMake is not installed or not in PATH"
    Write-Host "Please install CMake from https://cmake.org/download/" -ForegroundColor Yellow
    exit 1
}

# Show versions
Write-Host "Node.js version: " -NoNewline; node --version
Write-Host "Rust version: " -NoNewline; cargo --version
Write-Host "CMake version: " -NoNewline; cmake --version | Select-Object -First 1
Write-Host ""

# Clean if requested
if ($Clean) {
    Write-Progress-Custom "Cleaning previous builds"
    if (Test-Path "src-tauri/target") {
        Remove-Item -Recurse -Force "src-tauri/target"
        Write-Host "       Cleaned Rust target directory" -ForegroundColor Gray
    }
    if (Test-Path "src-tauri/lib/whisper.cpp/build") {
        Remove-Item -Recurse -Force "src-tauri/lib/whisper.cpp/build"
        Write-Host "       Cleaned whisper.cpp build directory" -ForegroundColor Gray
    }
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
        Write-Host "       Cleaned dist directory" -ForegroundColor Gray
    }
}

# Install npm dependencies
Write-Progress-Custom "Installing npm dependencies"
try {
    npm install
    Write-Host "       Dependencies installed successfully" -ForegroundColor Gray
}
catch {
    Write-Error-Custom "Failed to install npm dependencies"
    exit 1
}

# Check if Tauri CLI is available
Write-Progress-Custom "Checking Tauri CLI"
try {
    $null = npm list -g @tauri-apps/cli 2>$null
}
catch {
    Write-Progress-Custom "Installing Tauri CLI globally"
    npm install -g @tauri-apps/cli
}

# Build whisper.cpp library
Write-Progress-Custom "Building whisper.cpp library"
$whisperBuildPath = "src-tauri/lib/whisper.cpp/build"

Push-Location "src-tauri/lib/whisper.cpp"
try {
    if (-not (Test-Path "build")) {
        New-Item -ItemType Directory -Path "build" | Out-Null
    }
    
    Push-Location "build"
    try {
        Write-Host "       Configuring CMake..." -ForegroundColor Gray
        cmake .. -DCMAKE_BUILD_TYPE=Release -G "Visual Studio 17 2022" -A x64 -DBUILD_SHARED_LIBS=OFF -DGGML_STATIC=ON
        
        Write-Host "       Building whisper.cpp..." -ForegroundColor Gray
        cmake --build . --config Release --parallel
        
        Write-Host "       whisper.cpp build completed" -ForegroundColor Gray
    }
    finally {
        Pop-Location
    }
}
catch {
    Write-Error-Custom "whisper.cpp build failed: $_"
    Pop-Location
    exit 1
}
finally {
    Pop-Location
}

# Verify whisper.cpp build artifacts
Write-Progress-Custom "Verifying whisper.cpp build artifacts"
$whisperLib = "src-tauri/lib/whisper.cpp/build/src/Release/whisper.lib"
$ggmlLib = "src-tauri/lib/whisper.cpp/build/ggml/src/Release/ggml.lib"

if (Test-Path $whisperLib) {
    Write-Host "       ✓ whisper.lib found" -ForegroundColor Green
} else {
    Write-Warning-Custom "whisper.lib not found - build may fail"
}

if (Test-Path $ggmlLib) {
    Write-Host "       ✓ ggml.lib found" -ForegroundColor Green
} else {
    Write-Warning-Custom "ggml.lib not found - build may fail"
}

# Build Tauri application
Write-Progress-Custom "Building Tauri application"
$buildMode = if ($Release) { "release" } else { "debug" }
$env:RUST_BACKTRACE = "1"

try {
    if ($Release) {
        npm run build:windows
    } else {
        npm run tauri build -- --debug
    }
    Write-Host "       Tauri build completed successfully" -ForegroundColor Gray
}
catch {
    Write-Error-Custom "Tauri build failed: $_"
    exit 1
}

# Verify build outputs
Write-Progress-Custom "Verifying build outputs"
$exePath = "src-tauri/target/$Target/$buildMode/steno.exe"
$bundlePath = "src-tauri/target/$Target/$buildMode/bundle"

if (Test-Path $exePath) {
    $exeSize = [math]::Round((Get-Item $exePath).Length / 1MB, 2)
    Write-Host "       ✓ Main executable created ($exeSize MB)" -ForegroundColor Green
} else {
    Write-Error-Custom "Main executable not found at $exePath"
    exit 1
}

# Check installers
$msiPath = "$bundlePath/msi"
$nsisPath = "$bundlePath/nsis"

if (Test-Path $msiPath) {
    $msiFiles = Get-ChildItem "$msiPath/*.msi"
    if ($msiFiles) {
        Write-Host "       ✓ MSI installer created:" -ForegroundColor Green
        $msiFiles | ForEach-Object { 
            $size = [math]::Round($_.Length / 1MB, 2)
            Write-Host "         - $($_.Name) ($size MB)" -ForegroundColor Gray
        }
    }
} else {
    Write-Warning-Custom "MSI installer not found"
}

if (Test-Path $nsisPath) {
    $nsisFiles = Get-ChildItem "$nsisPath/*.exe"
    if ($nsisFiles) {
        Write-Host "       ✓ NSIS installer created:" -ForegroundColor Green
        $nsisFiles | ForEach-Object { 
            $size = [math]::Round($_.Length / 1MB, 2)
            Write-Host "         - $($_.Name) ($size MB)" -ForegroundColor Gray
        }
    }
} else {
    Write-Warning-Custom "NSIS installer not found"
}

# Create distribution directory
Write-Progress-Custom "Creating distribution package"
if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" | Out-Null
}

# Copy installers to dist
if (Test-Path $msiPath) {
    Copy-Item "$msiPath/*.msi" "dist/" -ErrorAction SilentlyContinue
}
if (Test-Path $nsisPath) {
    Copy-Item "$nsisPath/*.exe" "dist/" -ErrorAction SilentlyContinue
}

# Create portable package
if ($Portable -or (Test-Path $exePath)) {
    Write-Progress-Custom "Creating portable package"
    
    $portableDir = "portable-steno"
    if (Test-Path $portableDir) {
        Remove-Item -Recurse -Force $portableDir
    }
    
    New-Item -ItemType Directory -Path $portableDir | Out-Null
    Copy-Item $exePath "$portableDir/"
    
    # Create portable marker file
    New-Item -ItemType File -Path "$portableDir/portable.txt" | Out-Null
    
    # Create README for portable version
    @"
Steno Portable Version
=====================

This is a portable version of Steno. All application data (logs, models, database) 
will be stored in this directory.

Features:
- No installation required
- All data stored locally in this folder
- Can be run from USB drives or external storage

Usage:
1. Run steno.exe to start the application
2. The portable.txt file enables portable mode
3. All data will be stored in subfolders (data/, logs/, models/)

System Requirements:
- Windows 10/11 (64-bit)
- WebView2 (automatically installed if missing)

For support, visit: https://github.com/your-repo/steno
"@ | Out-File -FilePath "$portableDir/README.txt" -Encoding UTF8
    
    # Create ZIP package
    $zipPath = "dist/steno-portable-windows-x64.zip"
    try {
        Compress-Archive -Path $portableDir -DestinationPath $zipPath -Force
        $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
        Write-Host "       ✓ Portable package created: $zipPath ($zipSize MB)" -ForegroundColor Green
    }
    catch {
        Write-Warning-Custom "Failed to create portable ZIP package: $_"
    }
    
    # Cleanup
    Remove-Item -Recurse -Force $portableDir
}

# Generate checksums
Write-Progress-Custom "Generating checksums"
$distFiles = Get-ChildItem "dist/*" -Include "*.msi", "*.exe", "*.zip"
if ($distFiles) {
    $checksumPath = "dist/checksums.txt"
    $distFiles | ForEach-Object {
        $hash = Get-FileHash -Path $_.FullName -Algorithm SHA256
        $relativePath = $_.Name
        "$($hash.Hash)  $relativePath" | Add-Content $checksumPath
    }
    Write-Host "       ✓ Checksums generated: $checksumPath" -ForegroundColor Green
}

# Final summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "      Build completed successfully!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Output files in 'dist' folder:" -ForegroundColor Yellow
if (Test-Path "dist") {
    Get-ChildItem "dist" | ForEach-Object {
        $size = if ($_.PSIsContainer) { "DIR" } else { "$([math]::Round($_.Length / 1MB, 2)) MB" }
        Write-Host "  $($_.Name) ($size)" -ForegroundColor Gray
    }
} else {
    Write-Warning-Custom "No dist folder found"
}

Write-Host ""
Write-Host "Installation options:" -ForegroundColor Yellow
Write-Host "  1. MSI Installer: Recommended for most users (Windows Installer)" -ForegroundColor Gray
Write-Host "  2. NSIS Installer: Alternative installer with more customization" -ForegroundColor Gray
Write-Host "  3. Portable ZIP: No installation required, run directly" -ForegroundColor Gray
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  - Test the installers on clean Windows systems" -ForegroundColor Gray
Write-Host "  - Verify portable mode works correctly" -ForegroundColor Gray
Write-Host "  - Check that all features work as expected" -ForegroundColor Gray
Write-Host "  - Consider code signing for production releases" -ForegroundColor Gray