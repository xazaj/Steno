#!/bin/bash

# Build script for whisper.cpp dependency
# This script ensures whisper.cpp is properly built before the Rust build

set -e

echo "Building whisper.cpp library..."

# Navigate to whisper.cpp directory
cd "$(dirname "$0")/src-tauri/lib/whisper.cpp"

# Check if we're in the right directory
if [ ! -f "CMakeLists.txt" ]; then
    echo "Error: CMakeLists.txt not found. Make sure git submodules are initialized."
    echo "Run: git submodule update --init --recursive"
    exit 1
fi

# Create build directory
mkdir -p build
cd build

# Configure and build
echo "Configuring cmake..."
cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DGGML_STATIC=ON

echo "Building whisper.cpp..."
cmake --build . --config Release

echo "whisper.cpp build completed successfully!"

# Verify essential files exist
if [ ! -f "src/libwhisper.a" ]; then
    echo "Error: libwhisper.a not found after build"
    exit 1
fi

echo "Build verification passed. You can now build the Tauri application."