import { useEffect, useRef, useState } from "react";
import { useActiveDate } from "../lib/activeDate";
import { presetOf } from "../lib/presets";
import { STICKY_CLEARANCE, bringIntoView } from "../lib/scroll";
import type { Entry, Tracker, Variant } from "../lib/types";
import { useUnits, type UnitSystem } from "../lib/units";
import { activeDayLabel, daysAgo, lastSession, shortDate } from "../lib/utils";
import { EntryLogger } from "./EntryLogger";
import {
  TrackerForm,
  type MoveControls,
  type TrackerValues,
} from "./TrackerForm";
import { Button, Select, Tag } from "./ui";

/** How long the panel takes to open or close, in ms. */
const EXPAND_MS = 200;

export function TrackerItem({
  tracker,
  entries,
  expanded,
  editing,
  move,
  onToggle,
  onEditingChange,
  onUpdate,
  onRemove,
  onLog,
  onRemoveEntry,
}: {
  tracker: Tracker;
  entries: Entry[];
  expanded: boolean;
  editing: boolean;
  move: MoveControls;
  onToggle: () => void;
  onEditingChange: (editing: boolean) => void;
  onUpdate: (values: TrackerValues) => void;
  onRemove: () => void;
  onLog: (variant: Variant, values: Record<string, number>) => void;
  onRemoveEntry: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  /**
   * Two flags rather than one: `mounted` keeps the panel in the DOM while it
   * animates shut, `open` drives the height. Unmounting on collapse is what
   * resets the steppers to their defaults next time, so the animation must not
   * cost that — it only delays the unmount by the length of the transition.
   */
  const [mounted, setMounted] = useState(expanded);
  const [open, setOpen] = useState(expanded);
  const ref = useRef<HTMLLIElement>(null);
  const lastGroupId = useRef(tracker.groupId);

  const system = useUnits();
  const preset = presetOf(tracker);
  const primary = tracker.variants[0];
  // "Today" here means the day being logged into, which may be backdated.
  const { date: today, isToday } = useActiveDate();

  // The card always speaks for the primary version, so its numbers come from
  // the primary's own history — never from a substitution.
  const primaryLast = lastSession(
    entries.filter((e) => e.variantId === primary.id),
    preset.fields,
    system
  );
  // The badge, though, marks the tracker as logged: any variant counts.
  const doneToday = entries.some((e) => e.date === today);

  // Which version the logger is pointed at. Defaults to whatever was actually
  // logged today, so reopening the card after a substitution stays on it.
  const todaysLatest = entries
    .filter((e) => e.date === today)
    .reduce<Entry | null>(
      (newest, e) => (!newest || e.at > newest.at ? e : newest),
      null
    );
  const [selectedId, setSelectedId] = useState(
    () =>
      tracker.variants.find((v) => v.id === todaysLatest?.variantId)?.id ??
      primary.id
  );
  const selected = tracker.variants.find((v) => v.id === selectedId) ?? primary;

  const selectedEntries = entries.filter((e) => e.variantId === selected.id);
  const selectedToday = selectedEntries
    .filter((e) => e.date === today)
    .sort((a, b) => a.at - b.at);
  /**
   * What the steppers open on. Mid-session it continues from the set just
   * logged; otherwise it offers the *first* set of the last session — the
   * working weight that session was built around, rather than the lighter
   * drop-off it usually ends on.
   */
  const previousSession = lastSession(selectedEntries, preset.fields, system);
  const startFrom = selectedToday.at(-1) ?? previousSession?.entries[0];

  // The badge answers "when did I last do this exercise", which a substitution
  // counts towards just as much as the primary — unlike the numbers below it,
  // which speak only for the primary.
  const lastLogged = entries.reduce<string | null>(
    (latest, entry) => (!latest || entry.date > latest ? entry.date : latest),
    null
  );

  // What each variant would take with it if removed.
  const entryCounts = entries.reduce<Record<string, number>>(
    (counts, entry) => {
      counts[entry.variantId] = (counts[entry.variantId] ?? 0) + 1;
      return counts;
    },
    {}
  );

  // Logged today on a version other than the one on screen.
  const elsewhereToday = tracker.variants
    .filter((variant) => variant.id !== selected.id)
    .map((variant) => ({
      variant,
      count: entries.filter(
        (e) => e.date === today && e.variantId === variant.id
      ).length,
    }))
    .filter((row) => row.count > 0)
    .map((row) => `${row.variant.name} · ${row.count}`)
    .join(", ");

  // One flat list, joined with separators only *between* parts — a tracker with
  // no target must not open on a stray "·". An empty list renders nothing at
  // all rather than a placeholder.
  const meta: string[] = [];
  if (primary.target) meta.push(primary.target);
  if (primaryLast) meta.push(primaryLast.summary);
  if (tracker.variants.length > 1) {
    const count = tracker.variants.length - 1;
    meta.push(`${count} ${count === 1 ? "alternative" : "alternatives"}`);
  }

  // Sessions before the one being logged into, newest first — the same numbers
  // the chips show, but for the days already done.
  const history = Object.entries(
    selectedEntries
      .filter((e) => e.date < today)
      .sort((a, b) => a.at - b.at)
      .reduce<Record<string, Entry[]>>((byDate, entry) => {
        (byDate[entry.date] ??= []).push(entry);
        return byDate;
      }, {})
  )
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 5);

  // A move can carry the open editor into another group, far from the viewport.
  useEffect(() => {
    if (lastGroupId.current === tracker.groupId) return;
    lastGroupId.current = tracker.groupId;
    if (editing && ref.current) bringIntoView(ref.current, "center");
  }, [editing, tracker.groupId]);

  useEffect(() => {
    if (expanded) {
      // Both in one commit: the keyframe supplies its own starting height, so
      // there is no need to paint 0fr first.
      setMounted(true);
      setOpen(true);
      return;
    }

    setOpen(false);
    const timer = window.setTimeout(() => setMounted(false), EXPAND_MS);
    return () => window.clearTimeout(timer);
  }, [expanded]);

  // Expanding adds the whole logger below the header, which often pushes the
  // row past the bottom edge.
  useEffect(() => {
    if (!expanded) return;

    // Deferred past the animation: the card is still growing, so measuring
    // earlier reads a height the browser is about to change. (It also has to
    // clear the layout shift from whichever card this one just collapsed.)
    const timer = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;

      const { top, bottom, height } = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      if (top >= STICKY_CLEARANCE && bottom <= viewport) return;

      // 'nearest' scrolls the least amount needed; a row too tall to fit under
      // the sticky bar can never be shown whole, so show it from the top.
      bringIntoView(
        el,
        height > viewport - STICKY_CLEARANCE ? "start" : "nearest"
      );
    }, EXPAND_MS + 60);

    return () => window.clearTimeout(timer);
  }, [expanded]);

  if (editing) {
    return (
      <li
        ref={ref}
        style={{ scrollMarginTop: STICKY_CLEARANCE }}
        className="scroll-mb-3 border-2 border-ink p-3"
      >
        <TrackerForm
          initial={{ preset: tracker.preset, variants: tracker.variants }}
          submitLabel="Save"
          editing
          entryCounts={entryCounts}
          move={move}
          onSubmit={(values) => {
            onUpdate(values);
            onEditingChange(false);
          }}
          onCancel={() => onEditingChange(false)}
        />
      </li>
    );
  }

  return (
    <li
      ref={ref}
      style={{ scrollMarginTop: STICKY_CLEARANCE }}
      className="scroll-mb-3 border-2 border-ink"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${
          expanded ? "bg-accent text-accent-ink" : "hover:bg-ink/5"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{primary.name}</span>
            {primary.tag && <Tag>{primary.tag}</Tag>}
            {doneToday ? (
              <span
                className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                  expanded ? "bg-accent-ink text-accent" : "bg-ink text-paper"
                }`}
              >
                {activeDayLabel(today, isToday)}
              </span>
            ) : (
              lastLogged && (
                // Quieter than the "done" badge on purpose: it is context, not
                // an achievement — a hairline border and muted ink.
                <span
                  className={`shrink-0 border px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.12em] ${
                    expanded
                      ? "border-accent-ink/40 text-accent-ink/60"
                      : "border-ink/30 text-ink/50"
                  }`}
                >
                  {/* Relative only while the active day is today — "2d ago"
                      has no obvious reference point once Sep 9 is selected. */}
                  {isToday ? daysAgo(lastLogged) : shortDate(lastLogged)}
                </span>
              )
            )}
          </span>
          <span
            className={`mt-0.5 flex flex-wrap items-center gap-x-2 text-sm tabular-nums ${
              expanded ? "text-accent-ink/70" : "text-ink/60"
            }`}
          >
            {meta.map((part, index) => (
              <span
                key={`${part}-${index}`}
                className="flex items-center gap-2"
              >
                {index > 0 && <span aria-hidden>·</span>}
                {part}
              </span>
            ))}
          </span>
        </span>
        <span
          className={`shrink-0 text-lg leading-none transition-transform ${
            expanded ? "rotate-45" : ""
          }`}
          aria-hidden
        >
          +
        </span>
      </button>

      {mounted && (
        // 0fr → 1fr animates to the content's own height, which max-height
        // cannot do without guessing it.
        <div
          data-panel
          className="grid"
          style={{
            animation: `${
              open ? "panel-open" : "panel-close"
            } ${EXPAND_MS}ms ease-out forwards`,
          }}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 border-t-2 border-ink p-3">
              {tracker.variants.length > 1 && (
                <Select
                  label="Logging"
                  value={selected.id}
                  onChange={setSelectedId}
                  options={tracker.variants.map((variant) => ({
                    value: variant.id,
                    label: variantLabel(variant, tracker, entries, system),
                  }))}
                />
              )}

              <EntryLogger
                // Remount per variant: the steppers start from that version's own
                // last entry, not from whatever was on screen before the switch.
                key={selected.id}
                fields={preset.fields}
                logStyle={preset.logStyle}
                name={selected.name}
                dateLabel={activeDayLabel(today, isToday)}
                todayEntries={selectedToday}
                alsoToday={elsewhereToday}
                defaults={startFrom?.values ?? {}}
                onLog={(values) => onLog(selected, values)}
                onRemoveEntry={onRemoveEntry}
                history={history.map(([date, rows]) => ({
                  date: shortDate(date),
                  entries: rows,
                }))}
              />

              {confirming ? (
                <div className="flex items-center gap-2">
                  <span className="mr-auto text-sm">Remove this tracker?</span>
                  <Button size="sm" variant="solid" onClick={onRemove}>
                    Remove
                  </Button>
                  <Button size="sm" onClick={() => setConfirming(false)}>
                    Keep
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onEditingChange(true)}>
                    Edit
                  </Button>
                  <Button size="sm" onClick={() => setConfirming(true)}>
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

/** "Pec deck · 45 kg · 8 reps" — the last numbers make the choice informed. */
function variantLabel(
  variant: Variant,
  tracker: Tracker,
  entries: Entry[],
  system: UnitSystem
): string {
  const last = lastSession(
    entries.filter((e) => e.variantId === variant.id),
    presetOf(tracker).fields,
    system
  );
  // Kept short: a native select clips rather than wraps, and on iOS it does not
  // reliably ellipsize either. The target is left out — the card already shows
  // it, and the last numbers are what the choice actually turns on.
  const parts = [variant.name];
  if (tracker.variants[0].id === variant.id) parts.push("primary");
  if (last) parts.push(last.summary);
  return parts.join(" · ");
}
