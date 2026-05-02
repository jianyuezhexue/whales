#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BINARY_NAME="whales"

cd "$PROJECT_ROOT"

echo "==> Installing frontend dependencies..."
cd frontend
npm install
cd "$PROJECT_ROOT"

echo "==> Building frontend..."
cd frontend
npm run build-only
sed -i '' 's|// @ts-check|// @ts-nocheck|g' wailsjs/go/*/*.js
cd "$PROJECT_ROOT"

echo "==> Building Go binary..."
export GOPROXY='https://goproxy.cn,direct'
export CGO_LDFLAGS='-framework UniformTypeIdentifiers'
go build -tags desktop,production -o "$BINARY_NAME" .

echo "==> Launching $BINARY_NAME..."
./"$BINARY_NAME"