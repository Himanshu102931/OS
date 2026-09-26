# PlacementOS — Agent Instructions

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Type-check + production build (outputs to dist/)
npm run lint         # ESLint check
npm test             # Run Vitest suite (18 tests)
```

## Architecture Overview

**Local-first, zero-backend React 19 + TypeScript + Vite** application for systematic placement preparation (Sep 2026 – May 2027).

- **Persistence**: `localStorage` via `StorageAdapter` (`src/storage/storageAdapter.ts`). State key: `placementos_v1_state`.
- **Routing**: Client-side hash routing (`#/${route}`) — no server rewrites needed for deployment.
- **State**: Single React Context (`PlacementContext`) wraps entire app; all engines are pure functions.
- **Deterministic Adaptive Engine**: 6-factor weighted scoring (no randomness, no LLMs):
  ```
  Score = 0.25×Urgency + 0.20×Weakness + 0.20×Importance + 0.15×Company + 0.10×SpacedRep + 0.10×Recovery
  ```
- **Leitner 4-Box Spaced Repetition**: Box 1=1d, Box 2=3d, Box 3=7d, Box 4=14d (mastered).

## Key Engines (Pure Functions)

| Engine | File | Purpose |
|--------|------|---------|
| `adaptiveEngine` | `src/engine/adaptiveEngine.ts` | Priority scoring, daily plan selection, Leitner transitions, evidence scoring |
| `skillsEngine` | `src/engine/skillsEngine.ts` | Topic/domain readiness calculation, evidence aggregation, freshness decay |
| `dsaEngine` | `src/engine/dsaEngine.ts` | DSA problem filtering, progression tracking |
| `companyEngine` | `src/engine/companyEngine.ts` | Company overlay management, requirement matching |
| `analyticsEngine` | `src/engine/analyticsEngine.ts` | Telemetry, streak calculation, time allocation analysis |
| `practiceEngine` | `src/engine/practiceEngine.ts` | Practice session orchestration |

All engines are testable in isolation — they accept plain objects, return plain objects.

## Project Structure

```
src/
├── context/PlacementContext.tsx   # Single source of truth, hydration, persistence
├── engine/                        # Pure deterministic engines (no React deps)
├── data/                          # Seed datasets (phases, topics, tasks, DSA problems)
├── storage/storageAdapter.ts      # localStorage serialization, validation, migration
├── components/                    # UI components (organized by feature)
│   ├── ui/                        # shadcn/ui primitives (Button only currently)
│   ├── layout/AppShell.tsx        # Shell + navigation rail
│   ├── dashboard/                 # Overview, today's plan, quick stats
│   ├── roadmap/                   # 4-phase timeline view
│   ├── dsa/                       # Leitner boxes, problem catalog, attempt modal
│   ├── skills/                    # 11-domain matrix, override modal, evidence trace
│   ├── preparation/               # Topic workspace, practice runner
│   ├── practice/                  # Practice sessions
│   ├── companies/                 # Target company overlays
│   ├── analytics/                 # Telemetry, traceability
│   ├── project/                   # Project lab tracker
│   └── settings/                  # Backup export/import, full reset, preferences
├── types/index.ts                 # All TypeScript interfaces
├── lib/utils.ts                   # cn() class merge helper
├── App.tsx                        # Route switch (hash-based)
└── main.tsx                       # Entry point
```

## Development Conventions

- **Path aliases**: `@/*` → `src/*` (configured in `tsconfig.json`)
- **UI Components**: shadcn/ui with TailwindCSS 4 (`components.json` config). Only `Button` exists in `src/components/ui/` — add others via `npx shadcn@latest add <component>`.
- **Design System**: Defined in `docs/design/DESIGN.md` — dark mode, Inter + JetBrains Mono, bronze accent `#E5A93C`, tonal elevation, 1px borders. Do not introduce neon, glows, or soft shadows.
- **Density**: Compact by default (`densityMode: 'compact'` in settings).
- **No external API calls** — fully offline-capable.

## Testing

```bash
npm test                    # Run all tests once
npm test -- --watch        # Watch mode
npm test -- src/test/adaptiveEngine.test.ts  # Single file
```

- **Framework**: Vitest (no DOM, pure logic tests)
- **Coverage**: 18 tests covering adaptive scoring, Leitner transitions, evidence calculation, storage integrity, skills readiness.
- **Fixtures**: Inline mock objects in test files — no shared fixture directory.

## Common Tasks

### Add a new engine function
1. Create/modify file in `src/engine/`
2. Export pure function(s) with explicit types from `src/types/index.ts`
3. Add tests in `src/test/<engine>.test.ts`
4. Wire into `PlacementContext` if UI needs it

### Modify adaptive scoring weights
Edit `evaluateCandidateTask()` in `src/engine/adaptiveEngine.ts` — weights are hardcoded constants (total must equal 1.0). Update corresponding tests.

### Add a new route
1. Create view component in `src/components/<feature>/`
2. Import and add case in `App.tsx` switch statement
3. Add route to `RoutePath` type in `PlacementContext.tsx`
4. Add navigation item in `AppShell.tsx`

### Extend storage schema
1. Update `AppStorageState` in `storageAdapter.ts`
2. Update `validateStorageState()` for new fields
3. Handle migration in `loadState()` (merge with defaults)
4. Bump `CURRENT_SCHEMA_VERSION` if breaking

### Deploy
```bash
npm run build   # Outputs to dist/
# Deploy dist/ to Vercel, Netlify, GitHub Pages (static hosting)
```
Hash routing means no `_redirects` or rewrite rules needed.

## Gotchas

- **localStorage is device-specific** — use Settings → Export/Import JSON Backup to transfer state between browsers/devices.
- **Date handling**: All dates stored as ISO strings (`YYYY-MM-DD`). `getTodayISO()` in `PlacementContext` used for "today" comparisons.
- **Midnight rollover**: `PlacementContext` polls every 60s + on `window.focus` to detect date change and auto-seal unsealed days.
- **Day sealing is immutable** — once sealed, `DailyCheckIn.isSealed = true` and cannot be modified.
- **No TypeScript `strict: true`** — project uses `tsconfig.app.json` with relaxed settings; prefer explicit types.
- **ESLint ignores `.agents/**`** — agent instruction files are not linted.

## References

- **Design System**: `docs/design/DESIGN.md` (colors, typography, elevation, components)
- **README**: Project overview, commands, deployment
- **Types**: `src/types/index.ts` (complete type definitions)