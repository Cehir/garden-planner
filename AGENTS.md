# AGENTS.md

Quick-start notes for coding agents working on **Gartenplaner** — a client-only garden planner
(draw beds, place plants, seed bank, diary, crop rotation, shadow analysis, print).
User-facing docs live in `README.md` (German).

## Stack

- Vite 8 + React 19 + TypeScript ~6 (strict-ish: `noUnusedLocals`, `noUnusedParameters`,
  `verbatimModuleSyntax` → use `import type` for types, `erasableSyntaxOnly` → no enums/namespaces)
- Vitest 4 + React Testing Library + happy-dom (`globals: true`, setup in `src/test/setup.ts`)
- oxlint (`.oxlintrc.json`), no Prettier/ESLint
- No backend, no router, no state library. Only runtime deps are `react` / `react-dom` —
  do not add new runtime dependencies without asking.

## Commands

```bash
npm test          # vitest run (~0.5 s)
npm run lint      # oxlint
npm run build     # tsc -b && vite build  (this is the type check)
npm run dev       # dev server on 127.0.0.1 (bound to IPv4 on purpose)
```

Run **test → lint → build** after every change. Baseline (2026-10-23): 117 tests passing,
lint 0 errors / 4 known `only-export-components` warnings in `src/store.tsx`, build clean.
Don't introduce new warnings.

## Layout

```
src/
  types.ts        Data model (Garden, Bed, Plant, PlacedPlant, Seed, DiaryEntry, AppState)
                  + German label maps (LIGHT_LABELS, SOIL_LABELS, FAMILY_LABELS, …)
  store.tsx       reducer + historyReducer (undo/redo, transactions) + localStorage
                  persistence + StoreProvider/useStore
  plants.ts       DEFAULT_PLANTS catalog
  selectors.ts    plantsById, placedCenter        ← use these, don't re-implement
  grid.ts         gridLines (Editor + print)
  palette.ts      BED_COLORS, PLANT_COLORS, DEFAULT_BED_COLOR
  shadow.ts       shadow polygons + conflict detection (sun from south, SHADOW_LENGTH_FACTOR)
  seasons.ts      month/season helpers
  rotation.ts     crop-rotation cycle + repeat warnings
  seeds.ts        seed expiry status
  printPlan.ts    print SVG / legend / seed-bank HTML builders (pure)
  utils.ts        uid, snap, placedInYear
  utils/platform.ts  isMac
  App.tsx         layout, tool/selection state, keyboard shortcuts, import/export, print
  components/     Editor (SVG canvas, ~650 L), Toolbar, PlantLibrary (+ PlantForm),
                  SeedBank, BedDetails, Diary
```

Tests sit next to the source as `*.test.ts(x)`.

## Key concepts / gotchas

- **State:** one `AppState` object, mutated only via `dispatch(Action)` from `useStore()`.
  New state changes = new `Action` variant in `store.tsx` + reducer case + test in `store.test.ts`.
- **History:** every dispatch is an undo step (`MAX_HISTORY = 10`). For drags, wrap the many
  updates in `beginTransaction()` … `commitTransaction()` so they collapse into one step.
  `load` resets history.
- **Persistence:** auto-saved to `localStorage` key `gartenplaner-state-v1`. Loaded/imported data
  goes through `normalizeState()`, which fills defaults for fields added later. **When you add a
  field to the model, add a default in `normalizeState`** so old saves and JSON exports keep loading.
- **Units & coordinates:** garden/bed sizes are in **cm**. `PlacedPlant.x/y` are **relative
  (0–1) to its bed**; get absolute coords with `placedCenter()`. `size` is in cm.
- `MonthRange` is `[start, end]` with months 1–12; plants hold arrays of ranges
  (`sow`/`plant`/`harvest`). Ranges can wrap the year end.
- Each `PlacedPlant` has a `plantedYear`; the editor shows only the selected year
  (`placedInYear`).
- Deleting a bed removes its placed plants; deleting a plant removes its seeds (reducer handles it).
- Test setup replaces `localStorage` with an in-memory stub (Node ≥ 25 ships a broken one).

## Conventions

- **Language:** code identifiers in English; all UI strings, comments and test descriptions
  are mostly **German** — keep new UI text German and match the surrounding comment language.
- Style: no semicolons, single quotes, 2-space indent, trailing commas.
- Accessibility matters: icon-only buttons need `aria-label`; no nested `<button>`s.
  RTL tests query by role/name, so changing labels can break tests.
- Memoize derived maps/lists with `useMemo` (there were several bug fixes for this).
- Keep pure logic in plain `.ts` modules (TDD them), keep components thin.
- Commits: Conventional style — `feat:`, `fix:`, `refactor:`, `test:`; small, one task per commit.
  Issue refs like `GH #14` / `Fix #6` are used in messages.
- Work on a branch, PRs go to `main` on GitHub (`Cehir/garden-planner`).

## Ongoing work

Branch `refactoring-phase-1` executes the SOLID refactor plan in
`.hermes/plans/2026-09-12_215800-solid-code-quality-plan.md` (`.hermes/` is gitignored, local only).
Phase 0 (selectors/grid/palette) is done. Next: Phase 1 — split `store.tsx` into
`persistence.ts`, `history.ts`, `reducer.ts`, keeping re-exports from `store.tsx` so existing
imports/tests keep working. The plan is a **pure refactor: no behavior changes**, run all three
verify gates after each task, commit per task. The user prefers tasks done in-session rather
than delegated to subagents.
