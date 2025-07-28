@echo off
REM Build script for whisper.cpp dependency on Windows
REM This script ensures whisper.cpp is properly built before the Rust build

echo Building whisper.cpp library...

REM Navigate to whisper.cpp directory
cd /d "%~dp0src-tauri\lib\whisper.cpp"

REM Check if we're in the right directory
if not exist "CMakeLists.txt" (
    echo Error: CMakeLists.txt not found. Make sure git submodules are initialized.
    echo Run: git submodule update --init --recursive
    exit /b 1
)

REM Create build directory
if not exist "build" mkdir build
cd build

REM Configure and build
echo Configuring cmake...
cmake .. -DCMAKE_BUILD_TYPE=Release

echo Building whisper.cpp...
cmake --build . --config Release

echo whisper.cpp build completed successfully!

REM Verify essential files exist
echo Verifying build artifacts...

if exist "src\Release\whisper.lib" (
    echo ✓ Found whisper.lib
) else (
    echo ✗ Missing whisper.lib
    set BUILD_ERROR=1
)

if exist "ggml\src\Release\ggml-base.lib" (
    echo ✓ Found ggml-base.lib
) else (
    echo ✗ Missing ggml-base.lib
    set BUILD_ERROR=1
)

if exist "ggml\src\ggml-blas\Release\ggml-blas.lib" (
    echo ✓ Found ggml-blas.lib (BLAS support enabled)
) else (
    echo ⚠ ggml-blas.lib not found (BLAS support disabled - this is normal on Windows)
)

if exist "ggml\src\Release\ggml.lib" (
    echo ✓ Found ggml.lib
) else (
    echo ✗ Missing ggml.lib
    set BUILD_ERROR=1
)

if defined BUILD_ERROR (
    echo.
    echo Build verification failed! Some libraries are missing.
    echo Listing build directory structure:
    tree /f
    exit /b 1
) else (
    echo.
    echo ✓ Build verification passed - all required libraries found
)

echo Build verification passed. You can now build the Tauri application.