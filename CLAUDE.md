# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development

```bash
# Install frontend dependencies
cd frontend && npm install

# Development (hot-reload via Wails)
wails dev                          # from repo root

# Production build
wails build                        # builds macOS .app bundle

# Frontend-only commands (cd frontend)
npm run dev                        # Vite dev server (browser-only, no Go backend)
npm run build                      # type-check + build
npm run build-only                 # vite build only, skip type-check
npm run type-check                 # vue-tsc --noEmit
npm run lint                       # ESLint with auto-fix
npm run preview                    # preview built frontend (port 4173)

# Quick local build without Wails CLI (from repo root)
bash dev.sh                        # installs deps, builds frontend + Go, launches binary
```

## Architecture

This is a **Wails v2 desktop application** — Go backend + Vue 3 frontend communicating via IPC bindings.

**Go backend** (`app/`, `internal/`, `main.go`):
- `main.go` — Wails app entry point. Binds the `App` struct to the frontend at line 56. Platform-specific options for Mac (translucent titlebar, dark appearance) and Windows.
- `app/app.go` — The `App` struct implementing Wails lifecycle hooks (`Startup`, `DomReady`, `BeforeClose`, `Shutdown`). `Startup` initializes the PTY manager.
- `app/*.go` — Bound methods exposed to the frontend. Each file maps to a feature area: `pty_handler.go` (terminal), `knowledge.go` (wiki files), `file.go` (native dialogs), `aui.go` (plugin management), `market.go` (stub marketplace data).
- `app/compment/pty_manager.go` — PTY (pseudo-terminal) session management: start shell, write input, resize, stop, shutdown.
- Go module name is `changeme` (never renamed from Wails template). All internal imports use `changeme/...`.

**Frontend** (`frontend/src/`):
- Vue 3 Composition API with `<script setup>` throughout.
- **Vue SFC ordering**: Always `<template>` → `<script>` → `<style>`. This is the mandatory block order for all `.vue` files.
- Pinia stores, Vue Router (hash-based, required by Wails), vue-i18n (zh-Hans + en).
- xterm.js 5.x for terminal emulation, Tailwind CSS 3.x, marked for Markdown.
- Vite 3.x build with `@/` alias pointing to `./src`.

**IPC communication**: The frontend calls Go methods via auto-generated bindings in `frontend/wailsjs/`. Wails regenerates these when `app/` methods change — run `wails generate module` to update them. Composable functions in `frontend/src/composables/` wrap Wails calls with mock-data fallbacks, enabling browser-only development without the Go backend running.

**Directory conventions**:
- `.whales/` — Runtime data (wiki files, AUI instances, installed plugins).
- `frontend/public/aui-plugins/` — AUI plugin static assets, served at dev time via Vite middleware.
- Each menu has a folder under `views/<menu>/` with the main page as `<Menu>View.vue`. Page-specific sub-components go in `views/<menu>/components/`. Only truly shared components (used across menus) live in `frontend/src/components/` at the top level.

## Key Patterns

**Path safety**: All Go filesystem operations use `whalesPath()` (in `app/app.go:47`) which validates relative paths and rejects `..` and absolute paths. When adding file operations, always validate through this helper.

**AUI plugin system**: Plugins are directories with a `plugin.json` manifest and JS/CSS entry files, loaded from `.whales/aui-plugins/` at runtime. The Vite dev server has middleware to serve plugin files. Built-in renderers (table, browser-preview, todo) coexist with plugin renderers.

**PTY event bus** (in `stores/task.ts`): Real-time terminal output streams from backend PTY to frontend xterm.js via Wails runtime events (`pty-output`, `pty-exit`). The store dispatches events per task ID.

**Composable API layer** (in `composables/`): Wraps Wails IPC calls with fallback mock data so the frontend can run in browser-only mode (`npm run dev`). When adding new backend methods, add a corresponding composable wrapping the call.

**Workflow executor** (`composables/useWorkflowExecutor.ts`): Orchestrates workflow execution by resolving groups, workflows, and nodes. Workflows and nodes reference AUIs, skills, and agents by ID.

**Lazy-loaded routes**: All views are dynamically imported in `router/index.ts`.

## Internationalization

Two locales: `src/i18n/locales/zh-Hans.json` (default) and `en.json`. When adding UI text, add keys to both locale files. Usage: `const { t } = useI18n()` then `t('key.path')`.

## No tests

There are currently no automated tests (no Go unit tests, no Vitest/Cypress setup). The `tsconfig.config.json` references `vitest.config.*` patterns suggesting it was planned but never implemented.
