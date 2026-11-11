# Kerfly

Kerfly is a web app where a user assembles a kitchen from cabinet modules, enters dimensions, confirms, and gets a report of exactly what to buy: number of panel sheets per decor, HDF back panels, edge banding in meters, worktop, hardware, a cutting list, and visual cutting layouts per sheet.

Target users: cabinet makers and DIY customers, in Serbia first, then international markets.

## Golden rules

- **Correct numbers are the product.** Every formula in `src/core` must have unit tests. Never change a formula without updating its test.
- `src/core` is pure TypeScript: no React, no DOM, no side effects. The UI only calls core functions.
- **All internal values are millimeters (number).** Unit conversion (mm / inch) happens only in the UI layer.
- **No hard-coded construction assumptions.** Thickness, gaps, edge rules and hardware rules come from `Settings` / profiles.
- **No hard-coded user-facing strings.** All text goes through i18n (`sr` and `en` from day one).
- Work in phases (see bottom). Do not start a phase before the previous one's tests pass.

## Stack

- Vite + React + TypeScript (strict mode)
- Zustand for state
- Vitest for tests
- i18next + react-i18next
- SVG for kitchen elevation and sheet layouts (no chart/drawing libraries)
- No backend in v1. Persist project in localStorage (wrapped in try/catch) + JSON export/import.

## Folder structure

```
src/
  core/
    types.ts
    defaults.ts          // default Settings + market presets
    parts/
      index.ts           // generateParts(modules, settings): Part[]
      base.ts drawer.ts sink.ts wall.ts tall.ts
      fronts.ts          // shared door/front formulas
    edging.ts            // edge banding meters + subtractEdge logic
    hardware.ts          // hinges, slides, legs, handles...
    packing.ts           // guillotine sheet optimizer
    validate.ts          // returns { errors, warnings }
    report.ts            // buildReport(modules, settings): Report
    units.ts             // mm <-> inch, formatting
  ui/
    steps/SettingsStep.tsx BuilderStep.tsx ConfirmStep.tsx ReportStep.tsx
    components/KitchenElevation.tsx SheetLayout.tsx ModuleCard.tsx
  i18n/ sr.json en.json index.ts
  store.ts
  App.tsx
tests/ (or co-located *.test.ts)
```

## Data model

```ts
type MaterialKey = 'carcass' | 'front' | 'hdf';
type EdgeType = 'none' | 'thin' | 'thick';
type Units = 'mm' | 'in';

interface Settings {
  units: Units;
  market: 'eu' | 'us' | 'uk';
  sheet: { length: number; width: number };     // EU default 2800 x 2070
  hdfSheet: { length: number; width: number };  // default 2800 x 2070
  kerf: number;          // 4
  trim: number;          // 10, trimmed off every sheet edge
  t: number;             // carcass thickness 18
  gap: number;           // front gap 3
  edgeThin: number;      // 0.45
  edgeThick: number;     // 2
  subtractEdge: boolean; // subtract banding thickness from cut size
  grain: { carcass: boolean; front: boolean };  // true = no rotation
  decor: { carcass: string; front: string };
  worktopLength: number; // 4100
  worktopDepth: number;  // 600
  plinth: 'none' | 'board' | 'pvc';
  plinthHeight: number;  // 100
  wallLength?: number;
}

type ModuleType = 'base' | 'drawer' | 'sink' | 'wall' | 'tall';

interface Module {
  id: string;
  type: ModuleType;
  row: 'lower' | 'upper';   // tall belongs to lower
  order: number;
  W: number; H: number; D: number;
  doors: number;            // 0..2
  shelves: number;
  drawers?: number[];       // front heights, e.g. [140, 280, 280]
  doorSplitH?: number;      // tall only: height of lower door section
}

interface Part {
  moduleId: string;
  nameKey: string;          // i18n key, e.g. "part.side"
  material: MaterialKey;
  L: number;                // dimension along grain (along sheet length)
  Wd: number;
  qty: number;
  edges: { L1: EdgeType; L2: EdgeType; W1: EdgeType; W2: EdgeType };
}
```

Market presets in `defaults.ts`: `eu` = 2800x2070, t=18. `us`/`uk` = 2440x1220 (4x8 ft), t=18 (user may set 19). Units default: `mm` for eu, `in` for us.

## Default module dimensions (mm)

| Type   | W   | H    | D   | Notes |
|--------|-----|------|-----|-------|
| base   | 600 | 720  | 560 | + legs |
| drawer | 600 | 720  | 560 | 3 drawers |
| sink   | 800 | 720  | 560 | 2 doors |
| wall   | 600 | 720  | 320 | |
| tall   | 600 | 2100 | 560 | + legs |

## Part formulas

Notation: `t` carcass thickness, `g` front gap, `k` number of doors, `n` shelves.
Construction assumption (v1): bottom between sides, HDF back nailed on (overlay).

**Doors (all types):** width `(W - k*g) / k`, height `H - g`. Thick edge on all 4 sides. Material `front`.

**base**
| Part | Qty | L x Wd | Edges |
|---|---|---|---|
| side | 2 | H x D | L1 thin (front) |
| bottom | 1 | (W-2t) x D | L1 thin |
| rail | 2 | (W-2t) x 100 | only front rail: L1 thin |
| shelf | n | (W-2t-2) x (D-20) | L1 thin |
| back (hdf) | 1 | (W-4) x (H-4) | none |
| door | k | see above | all thick |

**sink:** same as base, without back and without shelves.

**drawer:** carcass same as base, no shelves. Drawers (wood box, ball-bearing slides, 13 mm per side; must be configurable later):
- front: `(W - g) x h_i`; default split `h_i = (H - m*g) / m`
- slide length `Lv` = largest of [250,300,350,400,450,500,550] that is `<= D - 10`
- box width `bw = W - 2t - 26`
- box height `bh = clamp(h_i - 40, 80, 200)`
- per drawer: sides 2 x `Lv x bh`; front+back 2 x `(bw - 2t) x bh`; bottom (hdf) 1 x `bw x Lv`; thin edge on top edge of box parts

**wall**
| Part | Qty | L x Wd | Edges |
|---|---|---|---|
| side | 2 | H x D | L1 thin |
| bottom + top | 2 | (W-2t) x D | L1 thin |
| shelf | n | (W-2t-2) x (D-20) | L1 thin |
| back (hdf) | 1 | (W-4) x (H-4) | none |

**tall:** like wall. If `doorSplitH` is set: two door levels, lower `doorSplitH - g`, upper `H - doorSplitH - g`, plus a fixed shelf `(W-2t) x D` at the split.

**plinth (board):** strip `plinthHeight x total lower row length`, split into pieces of max `sheet.length - 2*trim`.

**subtractEdge = true:** subtract banding thickness from the cut dimension for each banded edge. Example: door 597 x 717 with 2 mm banding on all sides is cut at 593 x 713.

### Reference test case (must pass)
base, W=600, H=720, D=560, t=18, g=3, 1 shelf, 1 door, subtractEdge=false:
- side 720x560 x2
- bottom 564x560 x1
- rail 564x100 x2
- shelf 562x540 x1
- back 596x716 x1
- door 597x717 x1

## Edge banding

Per edge type: `sum((edge length + 30) * qty)`, then `ceil(total * 1.10 / 1000)` meters. Report carcass and front banding separately.

## Hardware

| Item | Rule |
|---|---|
| hinges | per door: H<=900 → 2, <=1600 → 3, <=2000 → 4, else 5 |
| slides | 1 pair per drawer, length `Lv` |
| legs | base/drawer/sink/tall: 4, or 6 if W > 1000 |
| handles | 1 per front |
| shelf pins | 4 per shelf |
| wall hangers | 2 per wall module |
| confirmat screws | 2 per rail joint; `ceil(D/200)+1` per bottom/top joint. Mark as estimate. |
| worktop | `ceil(lower row length / worktopLength)` pieces + wall trim meters |

## Packing (guillotine)

Pack separately per material (carcass, front, hdf). Panel saws only do edge-to-edge cuts, so use guillotine packing.

```
usable = (sheet.length - 2*trim + kerf) x (sheet.width - 2*trim + kerf)
each piece occupies (L + kerf) x (Wd + kerf)
L runs along sheet length; rotation allowed only if material has no grain

pack(pieces, strategy):
  expand qty into single pieces, sort by strategy.sort
  for each piece:
    find best free rect across open sheets (strategy.fit), try rotation if allowed
    if none: open new sheet
    place, then split the free rect:
      horizontal: right=(x+pw, y, F.w-pw, ph), top=(x, y+ph, F.w, F.h-ph)
      vertical:   right=(x+pw, y, F.w-pw, F.h), top=(x, y+ph, pw, F.h-ph)
    drop rects with w<=0 or h<=0
```

Run all strategy combinations and keep the best:
- sort: area desc, longer side desc, L desc
- fit: Best Short Side Fit, Best Area Fit
- split: Shorter Leftover Axis, Longer Leftover Axis

Best = fewest sheets; tie-break = largest single free rect on the last sheet.
Output per sheet: placements `{x, y, w, h, rotated, partRef}` and utilization %.
A piece larger than an empty sheet is a validation error, caught before packing.

Required packing tests: no piece outside sheet bounds, no overlaps (pairwise), no rotation for grain materials, placed count == input count.

## Validation

| Check | Level |
|---|---|
| W < 150 or W > 1200 | error |
| single door wider than 600 | warning (suggest 2 doors) |
| any part larger than sheet | error |
| lower row sum > wallLength | error |
| lower row sum < wallLength - 50 | warning (filler needed) |
| drawer front heights + gaps != H | error |
| wall D > base D | warning |
| drawer box height < 80 | error |

## UI flow

1. **Settings**: market preset, units, sheet size, thickness, decors, grain, gap, subtractEdge, wall length.
2. **Builder**: two rows (lower / upper). Add buttons per module type. Module card with type, W, H, D, doors, shelves, drawers. Front elevation SVG with dimension lines; clicking a module selects it. Move left/right, duplicate, delete. Always show lower row sum vs wall length.
3. **Confirm**: list of errors and warnings. "Confirm and calculate" is disabled while errors exist.
4. **Report**:
   - Shopping list: sheets per decor (+ utilization), HDF sheets, banding meters, worktop, hardware
   - Cutting list per material (table + CSV export: name, length, width, qty, edges L1 L2 W1 W2, grain)
   - Sheet layouts (SVG per sheet, parts labeled)
   - Print stylesheet

## Out of scope for v1

Corner modules (show an explicit note to the user), AI sketch recognition, prices, user accounts, 3D view.

## Phases

1. Project setup, `types.ts`, `defaults.ts`, part generators + tests
2. Edging + hardware + tests
3. Packing + tests
4. Validation + report
5. UI: Settings + Builder with elevation SVG
6. UI: Confirm + Report + sheet layouts + CSV + print
7. i18n completion (sr, en), unit switching, polish

## Project state (v3)

The plan above is still the source of truth for the part formulas, edge banding, hardware and packing rules. What was built, and what is not obvious from the file names:

- **Commands:** `npm run dev`, `npm test`, `npm run build` (tsc + vite), `npm run deploy` (publishes `dist/` to the `gh-pages` branch by hand).
- **Pipeline:** `Settings` + `Module[]` → `generateParts` (`core/parts`, every part is tagged with the id of the board it is cut from) → `packBoards` (guillotine packing per board) → `buildReport` (shopping list, a cutting list per board, layouts) → UI (`ReportStep`; `ui/reportText.ts` writes the same list as sentences and as the TXT export).
- **Boards:** the default carcass, front and HDF boards are built from the flat settings (`sheet`, `t`, `decor`, `grain`, ...). Extra boards live in `settings.boards`. A cabinet picks `carcassBoard`, `frontBoard` and `hdfBoard`; typing a name in its card goes through `assignBoardByName` (same name = same board; boards made that way are removed again when unused). The carcass thickness of a cabinet comes from its carcass board.
- **Edge banding:** per board (`board.edge`, else `edgeName` of the defaults); lines with the same banding name are bought together (`core/edging.ts`). `subtractEdge` uses the banding thickness of the part's own board.
- **Handles:** a catalog in `settings.handles` with `defaultHandle`; `module.handle` is a handle id or `"none"`.
- **Colors:** a fixed palette of named colors (`core/palette.ts`); boards store the key. The drawing paints a cabinet in the color of its fronts.
- **UI:** a landing page (`store.started`), then three steps: Settings, Builder (with the check and the confirm bar), Report. Light and dark theme (`ui/theme.ts`). Everything the user sees goes through i18n (`sr` and `en`); `tests/app.test.tsx` checks that both files have the same keys (plural suffixes aside).
- **Saved projects:** `core/project.ts` validates everything strictly. When a setting or a module field is added, extend `parseProject` and its tests, and give old files a default.
- **Tests:** `tests/*.test.ts` run in node, `tests/*.test.tsx` in jsdom with Testing Library (`// @vitest-environment jsdom` on top). `tests/helpers.ts` has `mod()` and `settings`.
- **Deploy:** `.github/workflows/pages.yml` tests, builds and publishes to GitHub Pages on every push to `main`. Pushing a workflow file needs a token with the `workflow` scope (`gh auth refresh -h github.com -s workflow`).
- **Not built:** corner cabinets, prices, accounts, 3D view, worktop color, handle count per front.
