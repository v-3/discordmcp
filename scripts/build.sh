#!/bin/bash

# Discord MCP Server Build Script

set -e

echo "Building Discord MCP Server..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clean build directory
if [ -d "build" ]; then
    echo "Cleaning previous build..."
    rm -rf build
fi

# Build TypeScript
echo "Compiling TypeScript..."
npm run build

echo "Build completed successfully!"

# Check if build/index.js exists
if [ -f "build/index.js" ]; then
    echo "✓ Build artifact found: build/index.js"
else
    echo "✗ Build artifact not found: build/index.js"
    exit 1
fi
