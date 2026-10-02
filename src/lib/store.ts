import { useCallback, useEffect, useMemo, useState } from "react";
import * as db from "./db";
import type { Entry, Group, Tracker, Variant } from "./types";
import { ARCHIVE_GROUP, dateKey, isArchiveGroup, uid } from "./utils";

export function useGym() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Seeding is off: re-enable with
      //   if (import.meta.env.DEV) await db.ensureSchema(seedPlan)
      // and re-import seedPlan. Dev only — ensureSchema wipes on a SCHEMA bump.

      const data = await db.loadAll();

      if (cancelled) return;
      setGroups(data.groups);
      setTrackers(data.trackers);
      setEntries(data.entries);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const addGroup = useCallback(
    async (name: string) => {
      const group: Group = {
        id: uid(),
        name: name.trim(),
        order: groups.reduce((max, g) => Math.max(max, g.order), -1) + 1,
      };
      setGroups((prev) => [...prev, group]);
      await db.put(db.STORES.groups, group);
    },
    [groups]
  );

  const renameGroup = useCallback(async (id: string, name: string) => {
    let next: Group | undefined;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        next = { ...g, name: name.trim() };
        return next;
      })
    );
    if (next) await db.put(db.STORES.groups, next);
  }, []);

  const removeGroup = useCallback(
    async (id: string) => {
      const orphaned = new Set(
        trackers.filter((t) => t.groupId === id).map((t) => t.id)
      );
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setTrackers((prev) => prev.filter((t) => t.groupId !== id));
      setEntries((prev) => prev.filter((e) => !orphaned.has(e.trackerId)));
      await db.removeGroupCascade(id);
    },
    [trackers]
  );

  /** Moves a group one place up or down the page, renumbering 0..n. */
  const moveGroup = useCallback(
    async (id: string, direction: -1 | 1) => {
      const ordered = [...groups].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex((g) => g.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= ordered.length) return;

      const [moved] = ordered.splice(index, 1);
      ordered.splice(target, 0, moved);

      const changed: Group[] = [];
      const next = new Map<string, Group>();
      ordered.forEach((group, order) => {
        const updated = { ...group, order };
        next.set(updated.id, updated);
        if (group.order !== order) changed.push(updated);
      });

      if (changed.length === 0) return;

      setGroups((prev) => prev.map((g) => next.get(g.id) ?? g));
      await db.putMany(db.STORES.groups, changed);
    },
    [groups]
  );

  const addTracker = useCallback(
    async (groupId: string, values: Pick<Tracker, "preset" | "variants">) => {
      const tracker: Tracker = {
        id: uid(),
        groupId,
        order:
          trackers
            .filter((t) => t.groupId === groupId)
            .reduce((max, t) => Math.max(max, t.order), -1) + 1,
        ...values,
      };
      setTrackers((prev) => [...prev, tracker]);
      await db.put(db.STORES.trackers, tracker);
    },
    [trackers]
  );

  /**
   * Replaces the whole variant list in one write, so edits, added alternatives,
   * removals and promotion (the caller puts the primary first) land together.
   * Surviving variants keep their ids, so their entries stay attached — but a
   * variant dropped here takes its logged history with it, since an entry
   * names its variant by id alone. The preset is deliberately not writable:
   * entries are keyed by its fields.
   */
  const updateTracker = useCallback(
    async (id: string, values: Pick<Tracker, "variants">) => {
      const kept = new Set(values.variants.map((v) => v.id));
      const dropped = (trackers.find((t) => t.id === id)?.variants ?? [])
        .filter((v) => !kept.has(v.id))
        .map((v) => v.id);

      let next: Tracker | undefined;
      setTrackers((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          next = { ...t, ...values };
          return next;
        })
      );

      if (dropped.length > 0) {
        const orphaned = new Set(dropped);
        setEntries((prev) =>
          prev.filter((e) => !(e.trackerId === id && orphaned.has(e.variantId)))
        );
      }

      if (next) await db.saveTracker(next, dropped);
    },
    [trackers]
  );

  const removeTracker = useCallback(async (id: string) => {
    setTrackers((prev) => prev.filter((t) => t.id !== id));
    setEntries((prev) => prev.filter((e) => e.trackerId !== id));
    await db.removeTrackerCascade(id);
  }, []);

  /**
   * Archiving is an ordinary move: the tracker lands at the end of a group
   * named "Archive", created at the bottom of the plan the first time one is
   * needed. Nothing about the tracker changes — it is still logged, edited and
   * moved back out the same way — so there is no archived state to maintain.
   */
  const archiveTracker = useCallback(
    async (id: string) => {
      const tracker = trackers.find((t) => t.id === id);
      if (!tracker) return;

      const existing = groups.find((g) => isArchiveGroup(g.name));
      const archive: Group = existing ?? {
        id: uid(),
        name: ARCHIVE_GROUP,
        order: groups.reduce((max, g) => Math.max(max, g.order), -1) + 1,
      };
      if (tracker.groupId === archive.id) return;

      const moved: Tracker = {
        ...tracker,
        groupId: archive.id,
        order:
          trackers
            .filter((t) => t.groupId === archive.id)
            .reduce((max, t) => Math.max(max, t.order), -1) + 1,
      };

      if (!existing) {
        setGroups((prev) => [...prev, archive]);
        await db.put(db.STORES.groups, archive);
      }
      setTrackers((prev) => prev.map((t) => (t.id === id ? moved : t)));
      await db.put(db.STORES.trackers, moved);
    },
    [groups, trackers]
  );

  /**
   * Moves a tracker one step through the plan read top to bottom: past its
   * neighbour inside the group, or — from either end of a group — onto the end
   * of the previous group / the start of the next one. Groups keep a gap-free
   * 0..n order afterwards, and only changed records are written.
   */
  const moveTracker = useCallback(
    async (id: string, direction: -1 | 1) => {
      const groupIds = [...groups]
        .sort((a, b) => a.order - b.order)
        .map((g) => g.id);
      const buckets = groupIds.map((groupId) =>
        trackers
          .filter((t) => t.groupId === groupId)
          .sort((a, b) => a.order - b.order)
      );

      const bucketIndex = buckets.findIndex((bucket) =>
        bucket.some((t) => t.id === id)
      );
      if (bucketIndex === -1) return;

      const bucket = buckets[bucketIndex];
      const position = bucket.findIndex((t) => t.id === id);
      const [moved] = bucket.splice(position, 1);

      if (direction === -1) {
        if (position > 0) bucket.splice(position - 1, 0, moved);
        else if (bucketIndex > 0) buckets[bucketIndex - 1].push(moved);
        else return;
      } else {
        if (position < bucket.length) bucket.splice(position + 1, 0, moved);
        else if (bucketIndex < buckets.length - 1)
          buckets[bucketIndex + 1].unshift(moved);
        else return;
      }

      const changed: Tracker[] = [];
      const next = new Map<string, Tracker>();

      buckets.forEach((entriesInBucket, index) => {
        entriesInBucket.forEach((tracker, order) => {
          const updated = { ...tracker, groupId: groupIds[index], order };
          next.set(updated.id, updated);
          if (
            tracker.groupId !== updated.groupId ||
            tracker.order !== updated.order
          ) {
            changed.push(updated);
          }
        });
      });

      if (changed.length === 0) return;

      setTrackers((prev) => prev.map((t) => next.get(t.id) ?? t));
      await db.putMany(db.STORES.trackers, changed);
    },
    [groups, trackers]
  );

  /**
   * `picked` is the day being logged into, or null for today — resolved here
   * rather than by the caller, so a tab rendered before midnight cannot file
   * this morning's set into yesterday. `at` is placed inside the chosen day
   * rather than at the wall clock, so every "most recent" computation stays
   * chronological when a session is backfilled.
   */
  const logEntry = useCallback(
    async (
      trackerId: string,
      variant: Variant,
      values: Record<string, number>,
      picked: string | null = null
    ) => {
      const today = dateKey();
      const date = picked ?? today;
      const sameDay = entries.filter(
        (e) => e.trackerId === trackerId && e.date === date
      ).length;
      const at =
        date === today
          ? Date.now()
          : new Date(`${date}T12:00:00`).getTime() + sameDay * 60_000;

      const entry: Entry = {
        id: uid(),
        trackerId,
        variantId: variant.id,
        values,
        at,
        date,
      };
      setEntries((prev) => [...prev, entry]);
      await db.put(db.STORES.entries, entry);
    },
    [entries]
  );

  const removeEntry = useCallback(async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await db.remove(db.STORES.entries, id);
  }, []);

  /** Everything, for an export — the same three lists the database holds. */
  const snapshot = useCallback(
    () => ({ groups, trackers, entries }),
    [groups, trackers, entries]
  );

  /** Replaces the whole plan and its history, for an import or a reset. */
  const replaceAll = useCallback(
    async (data: {
      groups: Group[];
      trackers: Tracker[];
      entries: Entry[];
    }) => {
      setGroups(data.groups);
      setTrackers(data.trackers);
      setEntries(data.entries);
      await db.replaceAll(data);
    },
    []
  );

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.order - b.order),
    [groups]
  );

  const trackersByGroup = useMemo(() => {
    const map = new Map<string, Tracker[]>();
    for (const tracker of [...trackers].sort((a, b) => a.order - b.order)) {
      const list = map.get(tracker.groupId);
      if (list) list.push(tracker);
      else map.set(tracker.groupId, [tracker]);
    }
    return map;
  }, [trackers]);

  const entriesByTracker = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of entries) {
      const list = map.get(entry.trackerId);
      if (list) list.push(entry);
      else map.set(entry.trackerId, [entry]);
    }
    return map;
  }, [entries]);

  return {
    ready,
    groups: sortedGroups,
    trackersByGroup,
    entriesByTracker,
    addGroup,
    renameGroup,
    removeGroup,
    moveGroup,
    addTracker,
    updateTracker,
    removeTracker,
    moveTracker,
    archiveTracker,
    logEntry,
    removeEntry,
    snapshot,
    replaceAll,
  };
}
