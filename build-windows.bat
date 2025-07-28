@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    Steno Windows Build Script
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Check if Rust is installed
cargo --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Rust is not installed or not in PATH
    echo Please install Rust from https://rustup.rs/
    exit /b 1
)

REM Check if Tauri CLI is available
npm list -g @tauri-apps/cli >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing Tauri CLI globally...
    npm install -g @tauri-apps/cli
    if errorlevel 1 (
        echo [ERROR] Failed to install Tauri CLI
        exit /b 1
    )
)

echo [INFO] Installing npm dependencies...
npm install
if errorlevel 1 (
    echo [ERROR] Failed to install npm dependencies
    exit /b 1
)

echo [INFO] Building whisper.cpp library...
cd src-tauri\lib\whisper.cpp
if not exist build mkdir build
cd build

cmake .. -DCMAKE_BUILD_TYPE=Release -G "Visual Studio 17 2022" -A x64 -DBUILD_SHARED_LIBS=OFF -DGGML_STATIC=ON
if errorlevel 1 (
    echo [ERROR] CMake configuration failed
    cd ..\..\..\..
    exit /b 1
)

cmake --build . --config Release --parallel
if errorlevel 1 (
    echo [ERROR] whisper.cpp build failed
    cd ..\..\..\..
    exit /b 1
)

cd ..\..\..\..

echo [INFO] Verifying whisper.cpp build artifacts...
if exist "src-tauri\lib\whisper.cpp\build\src\Release\whisper.lib" (
    echo [OK] whisper.lib found
) else (
    echo [WARNING] whisper.lib not found - build may fail
)

if exist "src-tauri\lib\whisper.cpp\build\ggml\src\Release\ggml.lib" (
    echo [OK] ggml.lib found
) else (
    echo [WARNING] ggml.lib not found - build may fail
)

echo [INFO] Building Tauri application...
set RUST_BACKTRACE=1
npm run build:windows
if errorlevel 1 (
    echo [ERROR] Tauri build failed
    exit /b 1
)

echo [INFO] Verifying build outputs...
if exist "src-tauri\target\x86_64-pc-windows-msvc\release\steno.exe" (
    echo [OK] Main executable created
) else (
    echo [ERROR] Main executable not found
    exit /b 1
)

if exist "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi" (
    echo [OK] MSI installer created
    dir "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\*.msi" /b
) else (
    echo [WARNING] MSI installer not found
)

if exist "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis" (
    echo [OK] NSIS installer created
    dir "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\*.exe" /b
) else (
    echo [WARNING] NSIS installer not found
)

echo [INFO] Creating portable package...
if not exist dist mkdir dist
if exist "src-tauri\target\x86_64-pc-windows-msvc\release\steno.exe" (
    if exist portable-steno rmdir /s /q portable-steno
    mkdir portable-steno
    copy "src-tauri\target\x86_64-pc-windows-msvc\release\steno.exe" "portable-steno\"
    echo. > "portable-steno\portable.txt"
    echo Steno Portable Version > "portable-steno\README.txt"
    echo This is a portable version of Steno. All data will be stored in this directory. >> "portable-steno\README.txt"
    echo Create an empty "portable.txt" file to enable portable mode. >> "portable-steno\README.txt"
    
    powershell -Command "Compress-Archive -Path 'portable-steno' -DestinationPath 'dist\steno-portable-windows-x64.zip' -Force"
    if errorlevel 1 (
        echo [WARNING] Failed to create portable ZIP package
    ) else (
        echo [OK] Portable package created: dist\steno-portable-windows-x64.zip
    )
    
    rmdir /s /q portable-steno
)

echo [INFO] Copying installers to dist folder...
if exist "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi" (
    copy "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\*.msi" "dist\" >nul 2>&1
)
if exist "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis" (
    copy "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\*.exe" "dist\" >nul 2>&1
)

echo.
echo ========================================
echo      Build completed successfully!
echo ========================================
echo.
echo Output files are located in the 'dist' folder:
if exist dist (
    dir dist /b
)
echo.
echo Installation options:
echo 1. MSI Installer: Recommended for most users
echo 2. NSIS Installer: Alternative installer with more customization
echo 3. Portable ZIP: No installation required, run directly
echo.