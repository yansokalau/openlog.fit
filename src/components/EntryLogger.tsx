import { useEffect, useRef, useState } from "react";
import {
  fieldLabel,
  formatEntry,
  toCanonical,
  toDisplay,
  unitSpec,
} from "../lib/fields";
import type { Entry, Field, LogStyle } from "../lib/types";
import { useUnits } from "../lib/units";
import { BURST_MS, LogBurst } from "./LogBurst";
import { Button, Label } from "./ui";

/** Sessions listed under "Earlier" before the rest fold away. */
const HISTORY_SHOWN = 7;

/**
 * Logs one entry against the selected variant. One big stepper per field, so a
 * lift shows weight and reps while a measurement shows a single value — the
 * step size and decimals come from the field's kind.
 */
export function EntryLogger({
  fields,
  logStyle,
  name,
  dateLabel,
  todayEntries,
  alsoToday,
  defaults,
  history,
  onLog,
  onRemoveEntry,
}: {
  fields: Field[];
  logStyle: LogStyle;
  /** Labels the stepper when a tracker logs a single unnamed value. */
  name: string;
  /** The day being logged into: "Today", "Yesterday", "Sat 6 Mar". */
  dateLabel: string;
  todayEntries: Entry[];
  /** Variants of this tracker logged today that aren't on screen. */
  alsoToday?: string;
  /** Canonical values to start from, keyed by field. */
  defaults: Record<string, number>;
  /** Earlier sessions for this variant, newest first. */
  history: { date: string; entries: Entry[] }[];
  onLog: (values: Record<string, number>) => void;
  onRemoveEntry: (id: string) => void;
}) {
  const system = useUnits();

  // Held in display units while editing, converted on log.
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      fields.map((field) => [
        field.key,
        toDisplay(field, defaults[field.key] ?? 0, system),
      ])
    )
  );

  // Flipping kg↔lb must not reinterpret what is already on the steppers: the
  // physical quantity is held, the number it is shown as changes.
  const previous = useRef(system);
  useEffect(() => {
    const from = previous.current;
    if (from === system) return;
    previous.current = system;
    setValues((prev) =>
      Object.fromEntries(
        fields.map((field) => [
          field.key,
          toDisplay(
            field,
            toCanonical(field, prev[field.key] ?? 0, from),
            system
          ),
        ])
      )
    );
  }, [fields, system]);

  // Keyed by a counter so tapping again restarts the burst mid-flight.
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (burst === 0) return;
    // Outlives the animation by a frame or two, never cutting it short.
    const timer = window.setTimeout(() => setBurst(0), BURST_MS + 100);
    return () => window.clearTimeout(timer);
  }, [burst]);

  const [showAll, setShowAll] = useState(false);

  // A single extra session isn't worth a button to reveal it, so the tail only
  // collapses once there are at least two behind it.
  const hidden = history.length - HISTORY_SHOWN;
  const collapsible = hidden >= 2;
  const shownHistory =
    collapsible && !showAll ? history.slice(0, HISTORY_SHOWN) : history;

  const noun =
    logStyle === "sets"
      ? { one: "set", many: "sets" }
      : { one: "entry", many: "entries" };

  return (
    <div className="space-y-3">
      {fields.map((field) => {
        const { step, decimals } = unitSpec(field, system);
        const value = values[field.key] ?? 0;
        // Reads from `prev`, never the rendered value: taps in quick succession
        // are batched by React and would otherwise all start from the same one.
        const nudge = (by: number) =>
          setValues((prev) => ({
            ...prev,
            [field.key]: Math.max(
              0,
              round((prev[field.key] ?? 0) + by, decimals)
            ),
          }));

        return (
          <Stepper
            key={field.key}
            label={fieldLabel(
              field,
              system,
              fields.length === 1 ? name : undefined
            )}
            value={String(value)}
            onDec={() => nudge(-step)}
            onInc={() => nudge(step)}
            onChange={(raw) => {
              const next = Number(raw.replace(",", "."));
              if (Number.isFinite(next) && next >= 0) {
                setValues((prev) => ({ ...prev, [field.key]: next }));
              }
            }}
          />
        );
      })}

      <div className="relative">
        <Button
          variant="solid"
          size="lg"
          className="w-full"
          onClick={() => {
            onLog(
              Object.fromEntries(
                fields.map((field) => [
                  field.key,
                  toCanonical(field, values[field.key] ?? 0, system),
                ])
              )
            );
            setBurst((n) => n + 1);
          }}
        >
          Log {noun.one}
        </Button>
        {burst > 0 && <LogBurst key={burst} />}
      </div>

      <div>
        <Label>
          {dateLabel} · {todayEntries.length}{" "}
          {todayEntries.length === 1 ? noun.one : noun.many}
        </Label>
        {todayEntries.length === 0 ? (
          <p className="text-sm text-ink/50">Nothing logged yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {todayEntries.map((entry, index) => (
              <li
                key={entry.id}
                className="flex items-stretch border-2 border-current bg-accent text-accent-ink"
              >
                <span className="px-2 py-1 text-sm tabular-nums">
                  {formatEntry(fields, entry.values, system)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${noun.one} ${index + 1}`}
                  onClick={() => onRemoveEntry(entry.id)}
                  className="border-l-2 border-current px-2 text-sm leading-none hover:bg-accent-ink hover:text-accent"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {alsoToday && (
          <p className="mt-2 text-sm text-ink/50">Also logged: {alsoToday}</p>
        )}
      </div>

      {history.length > 0 && (
        <div>
          <Label>Earlier</Label>
          <ul className="space-y-1">
            {shownHistory.map((session) => (
              <li
                key={session.date}
                className="text-sm tabular-nums text-ink/60"
              >
                <span className="font-semibold text-ink/80">
                  {session.date}:
                </span>{" "}
                {session.entries
                  .map((entry) => formatEntry(fields, entry.values, system))
                  .join(", ")}
              </li>
            ))}
          </ul>
          {collapsible && (
            <Button
              variant="link"
              className="mt-2"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show less" : `Show ${hidden} more`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function round(value: number, decimals: number): number {
  const factor = 10 ** Math.max(decimals, 2);
  return Math.round(value * factor) / factor;
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
  onChange,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  onChange: (raw: string) => void;
}) {
  // While the field has focus the raw text is kept as typed, so intermediate
  // values like "62." survive; otherwise it mirrors the parsed value.
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <Label>{label}</Label>
      <div className="grid grid-cols-[3.5rem_1fr_3.5rem] border-2 border-ink">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={onDec}
          className="h-16 border-r-2 border-ink text-2xl leading-none hover:bg-ink hover:text-paper"
        >
          −
        </button>
        <input
          value={editing ? draft : value}
          inputMode="decimal"
          aria-label={label}
          onFocus={(e) => {
            setDraft(value);
            setEditing(true);
            e.currentTarget.select();
          }}
          onBlur={() => setEditing(false)}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(e.target.value);
          }}
          className="h-16 w-full text-center text-3xl font-semibold tabular-nums"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={onInc}
          className="h-16 border-l-2 border-ink text-2xl leading-none hover:bg-ink hover:text-paper"
        >
          +
        </button>
      </div>
    </div>
  );
}
