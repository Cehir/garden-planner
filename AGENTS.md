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

Run **test → lint → build** after every change. All three must be clean: every test passes,
oxlint prints nothing (0 errors / 0 warnings), build succeeds. Note the test count before you
start; it must not drop unless you removed tests deliberately (say so in the commit).
Focused/skipped tests (`.only`, `.skip`) are lint errors in `*.test.ts(x)`.
Don't introduce new warnings. Note: oxlint's `only-export-components` also flags non-component
*re-exports* from `.tsx` files — put hooks/helpers in `.ts` modules and import them from there.

## Layout

```
src/
  types.ts        Data model (Garden, Bed, Plant, PlacedPlant, Seed, DiaryEntry, AppState)
                  + German label maps (LIGHT_LABELS, SOIL_LABELS, FAMILY_LABELS, …)
  reducer.ts      Action union + reducer (pure; 'load' is handled in history.ts)
  history.ts      historyReducer: undo/redo, transactions, MAX_HISTORY (pure)
  persistence.ts  createDefaultState, normalizeState, loadState, saveState (localStorage)
  storeContext.ts State/Dispatch/HistoryContext + hooks: useStore, useStoreState, useStoreDispatch, useHistory
  store.tsx       StoreProvider only
  plants.ts       DEFAULT_PLANTS catalog
  selectors.ts    plantsById, placedCenter        ← use these, don't re-implement
  grid.ts         gridLines (Editor + print)
  palette.ts      BED_COLORS, PLANT_COLORS, DEFAULT_BED_COLOR
  shadow.ts       shadow polygons + conflict detection (sun from south, SHADOW_LENGTH_FACTOR)
  seasons.ts      month/season helpers
  rotation.ts     crop-rotation cycle + repeat warnings
  seeds.ts        seed expiry status
  printPlan.ts    print SVG / legend / seed-bank / full document builders + page scale (pure)
  printWindow.ts  openPrintWindow (DOM glue for the print dialog)
  utils.ts        uid, snap, placedInYear
  utils/platform.ts  isMac
  App.tsx         layout + wiring of the hooks below (GardenApp)
  hooks/          useEditorUi (tool/selection/filter/year state), useKeyboardShortcuts,
                  useFitZoom, useImportExport (parseImport, exportFileName are pure)
  editor/         Editor internals: geometry.ts (hit-test, resize, handles, CTM),
                  drag.ts (pointerDownIntent + dragMove, pure), useEditorPointer.ts
                  (pointer handlers + drag transaction), SVG parts (GridLayer, BedShape,
                  BedHandles, ShadowLayer, PlacedPlantShape, DraftRect, Compass)
  components/     Editor (thin SVG orchestrator), Toolbar, PlantLibrary (+ PlantForm),
                  SeedBank, BedDetails, Diary, StatusBar, MobileSidebar
```

Tests sit next to the source as `*.test.ts(x)`.

## Key concepts / gotchas

- **State:** one `AppState` object, mutated only via `dispatch(Action)`. In components use the
  narrow hooks from `storeContext.ts` (`useStoreState()`, `useStoreDispatch()`, `useHistory()`);
  only `App.tsx` uses the umbrella `useStore()`.
  New state changes = new `Action` variant + case in `reducer.ts` + test in `store.test.ts`
  (reducer tests; `normalizeState`/load/save tests live in `persistence.test.ts`).
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

The `refactoring-phase-*` branches execute the SOLID refactor plan in
`.hermes/plans/2026-09-12_215800-solid-code-quality-plan.md` (`.hermes/` is gitignored, local only).
Phases 0–3 are done (shared modules, store split, editor split, `App.tsx` split).
Deviations from the plan: `store.tsx` does **not** re-export the moved symbols (that kept the
lint warnings); importers point at the new modules directly. Phase 2 uses `editor/drag.ts`
(pure functions) instead of a `dragReducer`. Phase 3 uses `printPageScale(garden)` +
`printSvgSize(garden)` instead of `printPageScale(garden, opts)`. The plan's line numbers refer
to the pre-refactor files — locate code by name. Next: Phase 4 — split the sidebar components
(`BedDetails`, `PlantLibrary`, `SeedBank`, `Toolbar` props). The plan is a **pure refactor:
no behavior changes** (file pre-existing bugs as issues instead), run all three verify gates
after each task, commit per task. The user prefers tasks done in-session rather
than delegated to subagents.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`Cehir/garden-planner`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
