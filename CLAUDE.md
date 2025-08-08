# CLAUDE.md
必ず日本語で回答してください。
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development Workflow
```bash
# Start development environment (concurrent processes)
npm run dev                    # Starts both Vite dev server and Electron

# Individual process development
npm run dev:vite              # Start React dev server only (port 3000)
npm run dev:electron          # Compile main process and start Electron

# TypeScript compilation (dual contexts)
npx tsc -p tsconfig.main.json     # Compile main process (Node.js/Electron)
npx tsc --noEmit                   # Type check renderer process (React/Vite)

# Production builds
npm run build                 # Full build (renderer + main)
npm run build:renderer        # Build React app only
npm run build:main           # Compile Electron main process only

# Platform-specific distributions
npm run build:win            # Windows installer
npm run build:mac            # macOS DMG
npm run build:linux          # Linux AppImage
```

### Debugging & Troubleshooting
```bash
# Common dependency issues (especially in WSL/Windows)
rm -rf node_modules package-lock.json && npm install

# Force install missing native binaries
npm install @rollup/rollup-linux-x64-gnu --save-dev --force

# Alternative package manager (more reliable in WSL)
yarn install && yarn dev
```

## Architecture Overview

### Electron Multi-Process Architecture
This app follows Electron's secure architecture with **context isolation enabled**:

- **Main Process** (`src/main/`): Node.js environment managing app lifecycle, system APIs, database, IPC handlers
- **Preload Script** (`src/preload/`): Secure bridge exposing limited APIs to renderer via `contextBridge`  
- **Renderer Process** (`src/renderer/`): React app running in Chromium with restricted access

**Critical**: Main and renderer processes have separate TypeScript configurations and compilation contexts.

### Dual TypeScript Compilation
The project uses **two separate TypeScript configurations**:

1. **`tsconfig.main.json`**: Node.js environment (CommonJS, composite project)
   - Compiles to `dist/main/` 
   - Includes `src/main/**/*` and `src/shared/**/*`
   - Uses `@/shared/*` path alias for type sharing

2. **`tsconfig.json`**: Browser environment (ESModules, Vite bundling)
   - Renderer process only, excludes main process files
   - Uses path aliases: `@/*`, `@/shared/*`, `@/renderer/*`

### Secure IPC Communication Pattern
All communication uses typed IPC channels defined in `src/shared/types.ts`:

```typescript
// Channel naming convention
export const IPC_CHANNELS = {
  SNIPPET: { GET_ALL: 'snippet:get-all', CREATE: 'snippet:create' },
  // ...
}

// Unified response types
export type IPCResponse<T> = SuccessResponse<T> | ErrorResponse
```

**Key Pattern**: 
- Main process handlers in `src/main/ipc/handlers.ts` handle all business logic
- Preload script exposes type-safe wrapper functions
- Renderer uses `window.electronAPI.*` for all Electron functionality

### Database Layer Architecture
Uses **Better SQLite3** with operation abstraction:

- **Schema** (`src/main/db/schema.ts`): Database initialization, table creation, sample data
- **Operations** (`src/main/db/operations.ts`): Type-safe CRUD operations using shared types
- **Auto-migration**: Database and tables created automatically on first run

Data flow: `React Components` → `Custom Hooks` → `IPC` → `DB Operations` → `SQLite`

### State Management Pattern
React app uses **hooks-based architecture** with custom hooks for:

- `useCategories()`: Category CRUD with optimistic updates
- `useSnippets(filters)`: Snippet management with real-time search  
- `useTheme()`: Dark/light mode with system preference detection
- `useElectronEvents()`: Global shortcut and system event handling

## Critical Development Context

### Path Aliases & Module Resolution
Different resolution contexts require careful import handling:

```typescript
// In main process (Node.js style)
import type { Snippet } from '@/shared/types'

// In renderer process (Vite/ESM style)  
import type { Snippet } from '@/shared/types'
```

**Important**: Shared types in `src/shared/types.ts` must be accessible to both contexts with different path resolution.

### Japanese Documentation Requirements
All code must include comprehensive Japanese comments explaining:
- **何をする部分か** (What this part does)
- **なぜ必要か** (Why this is needed)

This is not optional - it's a core requirement for maintainability.

### Global Shortcuts & System Integration
The app provides global system access via:

- **Shortcuts**: `Ctrl+Shift+V` (toggle), `Ctrl+Shift+Q` (quick search)
- **System Tray**: Dynamic menu with recent snippets, context actions
- **Clipboard Integration**: Placeholder replacement system (`{date}`, `{time}`, etc.)

Implementation spans: `shortcuts/shortcutManager.ts`, `tray/trayManager.ts`, `ipc/handlers.ts`

### Security & Electron Best Practices
This app implements secure Electron patterns:

- `nodeIntegration: false` - No Node.js in renderer
- `contextIsolation: true` - Isolated contexts
- `webSecurity: true` - Standard web security
- IPC input validation on all channels
- CSP headers in index.html

**Never** bypass these security measures or enable `nodeIntegration`.

## Important Technical Details

### Placeholder Replacement System
Dynamic content replacement in snippets:
- Implementation: `src/main/ipc/handlers.ts` → `replacePlaceholders()`
- Supported: `{date}`, `{time}`, `{datetime}`, `{username}`, `{clipboard}`
- Execution: On copy-to-clipboard, not on storage

### Material-UI Integration
Theme system supports:
- Auto dark/light mode detection
- System preference following  
- Custom color schemes per category
- Responsive breakpoints for snippet cards

### SQLite Schema & Operations
Database design:
- **categories**: Base organization with sort_order, custom colors/icons
- **snippets**: Content with usage statistics, tags as JSON strings
- **settings**: Key-value store for app preferences
- Auto-timestamps via triggers, foreign key constraints enabled

### Development Workflow Notes
1. **Always run `npm run dev`** - don't start processes individually unless debugging
2. **Main process changes require restart** - Electron doesn't hot-reload main process
3. **Renderer changes auto-reload** - Thanks to Vite HMR
4. **Database changes**: Delete app data folder to reset during development
5. **Path alias issues**: Check both tsconfig files if imports fail