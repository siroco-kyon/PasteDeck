# CLAUDE.md
必ず日本語で回答してください。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start full development environment (Vite dev server + Electron)
npm run dev

# Individual process debugging
npm run dev:vite              # React dev server only (port 3000)
npm run dev:electron          # Compile main+preload, then start Electron

# TypeScript type checking
npx tsc -p tsconfig.main.json     # Compile main process
npx tsc --noEmit                   # Type check renderer (no output)

# Production builds
npm run build                 # Full build (renderer + main + preload)
npm run build:main            # Compile main process only → dist/main/
npm run build:preload         # Compile preload script → dist/preload/
npm run build:renderer        # Build React app → dist/renderer/

# Distribution packages
npm run build:win             # Windows NSIS installer → release/
npm run build:mac             # macOS DMG → release/
npm run build:linux           # Linux AppImage → release/

# Quality checks
npm run lint                  # ESLint (max-warnings 0)
npm test                      # Vitest unit tests

# Startup smoke test (auto-exits after 3 seconds)
npm run test:startup
```

### Troubleshooting Native Modules (Windows/WSL)
```bash
# better-sqlite3 compatibility issues
npx electron-rebuild

# Full dependency reset
rm -rf node_modules package-lock.json && npm install
```

## Architecture Overview

### Electron Multi-Process Architecture
This app uses Electron's secure architecture with **context isolation enabled**:

- **Main Process** (`src/main/`): Node.js — app lifecycle, database, IPC handlers, tray, shortcuts
- **Preload Script** (`src/preload/preload.ts`): Compiled separately (inline `tsc` command, not via tsconfig). Bridges main ↔ renderer via `contextBridge`, exposing `window.electronAPI.*`
- **Renderer Process** (`src/renderer/`): React app with no Node.js access

**Critical**: Main and renderer have separate TypeScript configurations. The preload has no dedicated tsconfig — it uses an inline `tsc` invocation in `npm run build:preload`.

### Dual TypeScript Compilation
1. **`tsconfig.main.json`**: CommonJS, Node.js environment → `dist/main/`
   - Includes `src/main/**/*` and `src/shared/**/*`

2. **`tsconfig.json`**: ESModules, Vite/browser environment → `dist/renderer/`
   - Excludes main process files
   - Path aliases: `@/*`, `@/shared/*`, `@/renderer/*`

`src/shared/types.ts` is the single source of truth for types shared across both contexts.

### Storage Architecture (SQLite with JSON Fallback)
The app uses **Better SQLite3** as primary storage, with automatic fallback to a JSON file if SQLite fails (common on WSL/Windows due to native binary issues):

- **SQLite primary**: `src/main/db/schema.ts` (init) + `src/main/db/operations.ts` (CRUD)
- **JSON fallback**: `src/main/db/jsonStorage.ts` — async file-based storage at `userData/clipboard-manager-data.json`
- **Fallback trigger**: `src/main/main.ts` `initializeApp()` catches SQLite init errors and calls `initializeJsonStorage()`
- **Handler fallback**: IPC handlers in `src/main/ipc/handlers.ts` also have per-call try/catch that falls back to `JsonOperations`

SQLite schema tables: `categories`, `snippets`, `settings`. Tags stored as JSON strings. Auto-timestamps via triggers, foreign keys enabled.

### IPC Communication Pattern
All channels are typed constants in `src/shared/types.ts` → `IPC_CHANNELS`. All responses use `IPCResponse<T> = SuccessResponse<T> | ErrorResponse`.

Data flow: `React Components` → `Custom Hooks` → `window.electronAPI.*` → `Preload` → `ipcRenderer.invoke` → `ipcMain.handle` → `DB Operations`

### State Management (Renderer)
Custom hooks in `src/renderer/hooks/`:
- `useCategories()` — Category CRUD with optimistic updates
- `useSnippets(filters)` — Snippet management with real-time search
- `useTheme()` — Dark/light mode following system preference
- `useElectronEvents()` — Global shortcut and system event handling

## Japanese Documentation Requirements
All code must include Japanese comments explaining:
- **何をする部分か** (What this part does)
- **なぜ必要か** (Why this is needed)

This is a core project requirement, not optional.

## Important Technical Details

### Placeholder Replacement
Executed at copy-to-clipboard time (not at storage time) in `src/main/ipc/handlers.ts` → `replacePlaceholders()`. Supported: `{date}`, `{time}`, `{datetime}`, `{username}`, `{clipboard}`.

### Security Constraints
- `nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true`
- IPC input validation on all channels
- **Never** bypass these settings or enable `nodeIntegration`

### Development Workflow Notes
- **Main process changes require Electron restart** — no hot-reload for main/preload
- **Renderer changes auto-reload** via Vite HMR
- **Reset database**: delete `%APPDATA%/clipboard-manager/` (Windows) or `~/.config/clipboard-manager/` (Linux)
- **Logs**: `%APPDATA%/clipboard-manager/logs/` (Windows) or `~/.config/clipboard-manager/logs/` (Linux)