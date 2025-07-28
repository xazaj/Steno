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
if not exist "src\libwhisper.a" (
    echo Error: libwhisper.a not found after build
    exit /b 1
)

echo Build verification passed. You can now build the Tauri application.