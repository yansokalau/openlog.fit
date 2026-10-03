# OpenLog

**openlog.fit** — a minimal tracker for anything you log by the session: lifts,
runs, climbing, body measurements. React + Vite + Tailwind v4, black-and-white plus a single
yellow accent, with a light/dark switch. All data lives in the browser's
IndexedDB (`openlog`). The only server code is the AI plan builder's one
stateless endpoint; the log itself never leaves the device.

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

## Site and PWA

- `/` is the landing page: static HTML in `index.html`, indexable, with the
  meta, Open Graph and JSON-LD in the markup itself. `src/landing.ts` only wires
  the install buttons, which stay hidden until the browser fires
  `beforeinstallprompt` (iOS gets a Share → Add to Home Screen hint instead).
- `/app/` is the app (`app/index.html` → `src/main.tsx`), marked `noindex` and
  disallowed in `robots.txt`: it is device-local data with nothing to index.
- The manifest and service worker come from `vite-plugin-pwa` in
  `vite.config.ts`. Scope is `/` so the landing page can offer the install;
  `start_url` is `/app/`, and an installed copy that lands on `/` is sent there.
  Everything is precached, so both pages open offline; only `/app/*`
  navigations fall back to the app shell. Updates apply on the next load.
- App icons (manifest, maskable, Apple) are rendered from `public/icon.png`;
  `favicon.ico` from `public/favicon.svg`, a separate design drawn for 16px;
  and the share image from
  `scripts/og.svg`, by `npm run icons`. The PNGs are committed.
- Cloudflare Pages: `public/_redirects` rewrites `/app/*` to the shell,
  `public/404.html` keeps unknown URLs real 404s rather than the landing page,
  and `public/_headers` stops `sw.js` and the manifest being cached.
- Moving the app from `/` to `/app/` keeps existing data: IndexedDB is per
  origin, not per path.

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

## AI plan builder

The builder is the empty plan's screen and the only way in: generating a new
plan means clearing the old one first (`⋯ → Clear everything`), so a generated
plan never has anything to merge with or replace. Two paths feed one endpoint:
**I have a program** (paste text and/or drop `.txt`, `.csv`, `.json` files) and
**Build one for me** (free text first, then optional quiz answers). The result
is previewed, then used as the plan. Skipping the builder shows the empty plan,
which links back to it.

- `functions/api/plan.ts` — Cloudflare Pages Function, `POST /api/plan`. Calls
  OpenAI Chat Completions with a strict JSON schema, so the response always has
  the plan's shape. Nothing is stored. Model is `OPENAI_MODEL` (default
  `gpt-5-mini`; any model with structured outputs works).
- `src/lib/planSchema.ts` — request/response types and the JSON schema, shared
  by the endpoint and the client so they cannot drift. The preset enum and the
  prompt's preset guide both come from `presets.ts`.
- `src/lib/aiPlan.ts` — file reading, the fetch, and `toRecords`, which assigns
  ids and orders and drops anything empty before it reaches IndexedDB.
- A dropped `.json` that is an OpenLog backup is offered as a restore instead of
  being sent to the model.
- Files are read as text and sent as-is; parsing CSV or JSON is the model's job.

Local development runs the function beside Vite, which proxies `/api` to it:

```bash
cp .dev.vars.example .dev.vars   # add OPENAI_API_KEY
npm run dev:api                  # wrangler pages dev on :8788
npm run dev
```

Every request carries a Cloudflare Turnstile token, checked by the function
before anything reaches OpenAI (`src/lib/turnstile.ts`). The widget is
invisible unless Cloudflare wants a click, and its script loads only when the
builder opens, so the rest of the app stays offline-capable. It is off in
local dev: `npm run dev` never loads it, and the function skips the check when
`.dev.vars` sets `SKIP_TURNSTILE` and the request is for localhost. The site
key lives in `.env.production`; production needs the secrets:

```bash
npx wrangler pages secret put OPENAI_API_KEY --project-name gym-tracker
npx wrangler pages secret put TURNSTILE_SECRET --project-name gym-tracker
```

The function fails closed: anywhere but localhost, a missing
`TURNSTILE_SECRET` refuses every request.

Abuse limits, cheapest first:

- Input caps (`planSchema.ts`): program 12k characters, notes 1k, whole
  request 16k. Quiz answers must be one of the quiz's own options; anything
  else is dropped. Files over 256 KB are refused unread.
- A WAF rate-limiting rule on `openlog.fit`: URI path equals `/api/plan`,
  counted by IP, 1 request per 10 s, block for 10 s — the free plan's one rule.
  It does not cover `*.pages.dev`, which serves the same function.
- A monthly budget on the OpenAI project, the hard ceiling on cost.

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
- **Seeding is development-only.** `npm run dev` starts from the sample plan;
  a deployed build never seeds, so it also never runs the SCHEMA wipe that goes
  with it — that wipe would take real training data with it. The branch is
  constant-folded away in production, so `seed.ts` is not in the bundle at all
  (`grep "Pec deck" dist/assets/*.js` finds nothing).
- No migrations while pre-release: the database stays at version 1 and `SCHEMA`
  in `src/lib/db.ts` is the record-shape stamp. Bump it after changing a stored
  shape and the next *dev* load wipes the data and reseeds the plan. A database left at
  a higher version — or missing a store after a rename — is discarded on open,
  since stores can only be created during a version upgrade.
- A matching stamp is never re-seeded, so deleting every group will not bring
  the starting plan back.
- The yellow accent (`--accent` in `src/index.css`) marks state only: the open
  tracker header, today's logged entries and picked quiz answers. Red
  (`--danger`) is for error messages only, which always say what went wrong in
  words too. Text on it is always black
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
