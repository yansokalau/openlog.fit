# OpenLog

**openlog.fit** — a minimal tracker for anything you log by the session: lifts,
runs, climbing, body measurements. React + Vite + Tailwind v4, black-and-white plus a single
yellow accent, with a light/dark switch. All data lives in the browser's
IndexedDB (`openlog`); there is no backend.

## Model

- **Group** — a user-named container: "Monday Gym", "Monday Running", "Body".
  Not a weekday; it just groups trackers.
- **Tracker** — anything loggable in a group: "Bench press", "Waist", "5k run".
  Its `preset` decides what a log looks like — Strength, Reps only, Hold, Cardio,
  Body measure, Bodyweight or Count — picked once at creation and read-only
  after, since entries are keyed by the preset's fields.
- **Variant** — an alternative version of a tracker, for an occupied machine or
  a change of mind. `variants[0]` is the primary; promoting moves one to front.
  Each carries a **target** (free-text reference: "3x6-8", "100 kg", "5 km in
  25 min") and a **tag** (short badge shown on the card: "optional", "archived",
  "every 2 weeks"). Both are free text with no behaviour attached.
- **Entry** — one logged record, holding canonical values keyed by field.
- **Session** — derived, never stored: one group's entries on one date.

```bash
npm install
npm run dev
```

## Structure

- `src/lib/db.ts` — IndexedDB access (stores: `groups`, `trackers`, `entries`,
  `meta`), cascading deletes, and the seed of the starting plan.
- `src/lib/fields.ts` — the closed vocabulary of measurable kinds (weight, reps,
  length, distance, duration, count, RPE) with their units, stepper increments
  and formatting. Adding a kind is a row here, not a new screen.
- `src/lib/presets.ts` — the tracking types, each a bundle of fields plus a log
  style. Field keys are a stable API: a preset may gain a field, but an existing
  key must never be renamed.
- `src/lib/units.ts` — the metric/imperial preference and the display unit per
  kind. Ambient via context, since every formatter needs it.
- `src/lib/activeDate.ts` — the day entries are logged into. Ambient too, and
  never persisted: a reload always lands back on today.
- `src/lib/scroll.ts` — `bringIntoView`, which falls back to an instant jump
  where `behavior: 'smooth'` is silently ignored.
- `src/lib/store.ts` — `useGym()`: in-memory state kept in sync with IndexedDB.
  `moveTracker` treats the plan as one flat list: a step from either end of a
  group lands in the adjacent group, and both affected groups are renumbered
  0..n. `moveGroup` does the same one level up, for the groups themselves.
- `src/lib/utils.ts` — last-session summary (per-field ranges), date helpers.
- `src/lib/seed.ts` — the starting plan, written on a first run or SCHEMA bump.
- `src/lib/backup.ts` — the export file format and the validation an import has
  to pass before it is allowed to replace everything.
- `src/components/` — group sections, tracker rows, the entry logger, and the
  header menu holding display settings and the data actions.

## Backups

The `⋯` menu exports the whole database as JSON and imports it back. An import
**replaces** everything rather than merging — it is a restore, not a sync — so it
asks first and states what it is about to write. Files are checked for the right
app, a known format version and intact records before any of that; a bad file is
refused with a reason and nothing is touched.

Since data lives only in one browser on one origin, an export is the only way to
move it between devices or survive a cleared browser.

## Notes

- An entry names its variant by `variantId` alone, so removing a variant
  deletes its logged history with it — the tracker write and the entry deletes
  happen in one transaction (`saveTracker`). Reordering or renaming a variant
  is safe; only removal destroys data.
- Values are stored in each kind's **canonical unit** (kg, cm, s, m). The
  metric/imperial switch in the header is display only: an entry logged as 5 mi
  reads back as 8.05 km without being rewritten. It defaults to metric rather
  than guessing from the locale, because the starting plan is written in kg.
  Units are global, never per tracker — mixed units make summaries meaningless.
- Fields come from the tracker's preset and are shared by every variant, so a
  substitution stays comparable with the movement it replaced.
- No migrations while pre-release: the database stays at version 1 and `SCHEMA`
  in `src/lib/db.ts` is the record-shape stamp. Bump it after changing a stored
  shape and the next load wipes the data and reseeds the plan. A database left at
  a higher version — or missing a store after a rename — is discarded on open,
  since stores can only be created during a version upgrade.
- A matching stamp is never re-seeded, so deleting every group will not bring
  the starting plan back.
- The yellow accent (`--accent` in `src/index.css`) marks state only: the open
  tracker header and today's logged entries. Text on it is always black
  (`--accent-ink`) so it reads in both themes.
- Theme is kept in `localStorage` (not IndexedDB) so the inline script in
  `index.html` can apply it synchronously and avoid a flash on load.
- Expanded/editing state lives in `App`, not in the row. Moving a tracker into
  another group re-parents it, and row-local state would be dropped mid-edit.
- Backfilling past sessions is a mode, not a per-entry field: the date control
  in the sticky header names the day being logged into, turns yellow when it
  isn't today, and resets on reload. Its picker overlays rather than expands, so
  opening it never shifts the plan underneath. Entries written into a past day get an `at` inside that day rather
  than the wall clock, so "most recent" stays chronological.
- "Today" is resolved when a set is logged, not when the page rendered — a tab
  left open across midnight would otherwise file the next morning's first set
  into yesterday. `useResolvedActiveDate` additionally re-renders on
  `visibilitychange`, `focus`, and a timer to the next local midnight, so the
  labels re-date themselves without a tap.
- The main list sets `overflow-anchor: none`. Collapsing one card while opening
  another changes the page height, and the browser's scroll anchoring would
  otherwise shift the page out from under the card just opened.
- History is stored (each entry carries a timestamp and a calendar date), but the
  UI only surfaces today's entries and the most recent session's values. There is
  no index on `date` yet: everything is loaded at boot and filtered in memory,
  which is fine for years of training. Deleting a *tracker* still cascade-deletes
  its entries — that has to change before history becomes a feature.
