# AGENTS.md

Quick-start notes for coding agents working on **Gartenplaner** — a client-only garden planner
(draw beds, place plants, seed bank, diary, crop rotation, shadow analysis, print).
User-facing docs live in `README.md` (German).

## Stack

- Vite 8 + React 19 + TypeScript ~6 (strict-ish: `noUnusedLocals`, `noUnusedParameters`,
  `verbatimModuleSyntax` → use `import type` for types, `erasableSyntaxOnly` → no enums/namespaces)
- Vitest 4 + React Testing Library + happy-dom (`globals: true`, setup in `src/test/setup.ts`)
- Playwright Test for E2E (`e2e/`, Chromium desktop + Pixel 7) against `vite preview` on port 4180 —
  see `docs/adr/0001-e2e-testing-strategy.md`
- oxlint (`.oxlintrc.json`), no Prettier/ESLint
- No backend, no router, no state library. Only runtime deps are `react` / `react-dom` —
  do not add new runtime dependencies without asking.

## Commands

```bash
npm test          # vitest run (~0.5 s)
npm run lint      # oxlint
npm run build     # tsc -b && vite build  (this is the type check)
npm run dev       # dev server on 127.0.0.1 (bound to IPv4 on purpose)
npm run e2e       # playwright test (builds + serves itself, ~2 s); first time per machine:
                  #   npx playwright install chromium
```

Run **test → lint → build** after every change. All three must be clean: every test passes,
oxlint prints nothing (0 errors / 0 warnings), build succeeds. Note the test count before you
start; it must not drop unless you removed tests deliberately (say so in the commit).
Focused/skipped tests (`.only`, `.skip`) are lint errors in `*.test.ts(x)`.
Don't introduce new warnings.

**E2E (`npm run e2e`)** is additionally required for changes to UI code (`src/components/`,
`src/editor/`, `App.tsx`, CSS) and always before opening a PR. Every UI bug fix gets an E2E
regression test. `test.only` fails the run (`forbidOnly`); focus with
`npx playwright test <file> -g '<name>'` instead. Locally an already running server on port 4180
is reused without rebuilding, so stop it (or restart it after `vite build`) to test fresh code.

**CI** (`.github/workflows/ci.yml`) runs test → lint → build → e2e on every PR and on pushes to
`main` (Node 24, Chromium only). On failure the Playwright report is uploaded as the
`playwright-report` artifact (traces included). Don't merge a PR with red CI.

**Git hooks** (`.githooks/`, activated by `npm install` via the `prepare` script →
`core.hooksPath`): pre-commit runs test + lint, pre-push runs build + e2e. They check the working
tree, not just staged changes. `--no-verify` skips them; CI still runs everything.

Note: oxlint's `only-export-components` also flags non-component *re-exports* from `.tsx` files —
put hooks/helpers in `.ts` modules and import them from there.

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
  grid.ts         gridLines (Editor + print), snap
  palette.ts      BED_COLORS, PLANT_COLORS, DEFAULT_BED_COLOR
  shadow.ts       shadow polygons + conflict detection (sun from south, SHADOW_LENGTH_FACTOR)
  seasons.ts      month/season helpers
  rotation.ts     crop-rotation cycle + repeat warnings
  seeds.ts        seed expiry status + seedBadge
  bedStats.ts     bedStats: per-bed count, utilization, conflicts, rotation (pure; own module
                  because shadow.ts/rotation.ts import selectors.ts)
  printPlan.ts    print SVG / legend / seed-bank / full document builders + page scale (pure)
  printWindow.ts  openPrintWindow (DOM glue for the print dialog)
  id.ts           uid
  selection.ts    placedInYear
  utils/platform.ts  isMac
  App.tsx         layout + wiring of the hooks below (GardenApp)
  hooks/          useEditorUi (tool/selection/filter/year state), useKeyboardShortcuts,
                  useFitZoom, useImportExport (parseImport, exportFileName are pure)
  editor/         Editor internals: geometry.ts (hit-test, resize, handles, CTM),
                  drag.ts (pointerDownIntent + dragMove, pure), useEditorPointer.ts
                  (pointer handlers + drag transaction), SVG parts (GridLayer, BedShape,
                  BedHandles, ShadowLayer, PlacedPlantShape, DraftRect, Compass)
  components/     Editor (thin SVG orchestrator), Toolbar (view/onView/actions props),
                  PlantLibrary (PlantsPanel), SeedBank (+ SeedForm), BedDetails (picks a
                  panel), Diary, StatusBar, MobileSidebar
    bed/          PlacedPlantPanel, GardenPanel, BedPanel, BedStats
    plants/       PlantForm, RangeFields (RangeField, RangeListField), PlantMeta (icons, months)
```

Tests sit next to the source as `*.test.ts(x)`. E2E specs live in `e2e/`:
`*.spec.ts` runs on desktop, `*.mobile.spec.ts` on the mobile viewport; import `test`/`expect`
from `e2e/fixtures.ts`.

## E2E conventions

- Query by role/name (`getByRole('group', { name: 'Beet: Hochbeet' })`), never `data-testid`.
  The editor SVG exposes `Gartenplan`, `Beet: <Name>`, `<Pflanze> in <Beet>` (selection via
  `aria-current`), `Beetgröße ändern: Nordwest…West`, `Pflanzengröße ändern`, `Schatten: <Pflanze>`,
  `Schattenkonflikt` (inside the plant group) and the ruler group `Lineal`. New SVG elements need
  accessible names too.
- Flows that are *about* creating something go through the UI; all others start from
  `await seedState({ beds: [...], garden: { width: 600 } })` before `page.goto('/')`. The patch
  goes through `normalizeState` (partial `garden` is fine) and lands in localStorage once per
  tab, so `page.reload()` keeps the app's own saves.
- Editor helpers live in `e2e/editor.ts`: `bedGroup`/`plantGroup` locators, `toScreen(page, cm)`
  and `dragBy(page, fromPx, dxCm, dyCm)` for pointer gestures in garden centimetres, and
  `savedState(page)` to assert on what the app wrote to localStorage. Names match by substring
  unless `exact: true` (`Beetgröße ändern: Nord` also hits `Nordwest`).
- Shared sample data (`sampleBed` „Hochbeet“, `sampleTomato`, `currentYear`) comes from
  `e2e/fixtures.ts`. Browser dialogs: answer `confirm`/`alert` with `page.once('dialog', …)`
  before the click; for the print popup stub `window.print` via `context().addInitScript` (real
  `print()` fires `afterprint` at once in headless Chromium and the app closes the window).
- Visual checks are geometry assertions (bounding boxes inside garden/viewport), not screenshots:
  `isInside`/`overlaps` from `e2e/geometry.ts`, with a message naming both boxes (`fmt`). Before
  trusting a new layout test, temporarily reintroduce the bug it guards against and watch it fail.
- A bug found while writing a test → GitHub issue + `test.fail()` with a `// GH #n` comment,
  don't fix it in the same PR.

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
- Work on a branch, PRs go to `main` on GitHub (`Cehir/garden-planner`) and are squash-merged.
- Do tasks in-session rather than delegating them to subagents (user preference).

## Ongoing work

The SOLID refactor plan in `.hermes/plans/2026-09-12_215800-solid-code-quality-plan.md`
(`.hermes/` is gitignored, local only) is merged into `main`: phases 0–5 (shared modules, store
split, editor split, `App.tsx` split, sidebar split, type-safety/DRY/OCP polish), PRs #23–#32.
Only the plan's final manual verification pass remains. The plan is a pure refactor, so bugs
that pass turns up go into GitHub issues instead of being fixed inline. The plan's line numbers
refer to the pre-refactor files — locate code by name.

Intentional deviations from the plan (the code is right, not the plan): `store.tsx` does
**not** re-export the moved symbols — importers point at the new modules directly. Phase 2 uses
`editor/drag.ts` (pure functions) instead of a `dragReducer`. Phase 3 uses
`printPageScale(garden)` + `printSvgSize(garden)` instead of `printPageScale(garden, opts)`.
Phase 4 puts `bedStats` in `bedStats.ts` (not `selectors.ts`, to avoid an import cycle);
`SeedForm` takes one `SeedDraft` + `onChange(patch)` instead of five field props; `Toolbar` gets
`onView` as one setter per field (not `onView(patch)`) and reads garden/years via
`useStoreState()` and undo/redo via `useHistory()` instead of props. Phase 5 uses an
`isRangeList` type guard instead of `as` casts in `toRanges`; `utils.ts` was deleted without a
temporary barrel; `detectMac` checks `userAgentData.platform` case-insensitively **or** the user
agent (not `??`), so behavior matches the old check.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`Cehir/garden-planner`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
