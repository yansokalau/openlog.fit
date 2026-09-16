import type { Entry, Group, Tracker } from "./types";

const DB_NAME = "gym-tracker";
const DB_VERSION = 1;

/**
 * Record-shape stamp. While the app is pre-release there are no migrations:
 * bump this whenever the stored shape changes, and the database is wiped and
 * reseeded from the plan on the next load.
 */
const SCHEMA = 6;

export const STORES = {
  groups: "groups",
  trackers: "trackers",
  entries: "entries",
  meta: "meta",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function connect(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORES.groups)) {
        db.createObjectStore(STORES.groups, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.trackers)) {
        const store = db.createObjectStore(STORES.trackers, { keyPath: "id" });
        store.createIndex("groupId", "groupId");
      }
      if (!db.objectStoreNames.contains(STORES.entries)) {
        const store = db.createObjectStore(STORES.entries, { keyPath: "id" });
        store.createIndex("trackerId", "trackerId");
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function destroy(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () =>
      reject(new Error("Another tab is holding the database open"));
  });
}

function hasEveryStore(db: IDBDatabase): boolean {
  return Object.values(STORES).every((name) =>
    db.objectStoreNames.contains(name)
  );
}

function open(): Promise<IDBDatabase> {
  dbPromise ??= (async () => {
    let db: IDBDatabase;

    try {
      db = await connect();
    } catch (error) {
      // A database left by an earlier build can sit at a higher version, which
      // cannot be opened at version 1. Pre-release: throw it away and reseed.
      if (!(error instanceof DOMException) || error.name !== "VersionError")
        throw error;
      console.warn("[openlog] Discarding a database left by an older build.");
      await destroy();
      return connect();
    }

    // Stores are only created during an upgrade, and the version is frozen, so
    // a renamed store would otherwise be missing forever. Start over instead.
    if (!hasEveryStore(db)) {
      console.warn("[openlog] Store layout changed; rebuilding the database.");
      db.close();
      await destroy();
      return connect();
    }

    return db;
  })();

  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function ask<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll<T>(name: StoreName): Promise<T[]> {
  const db = await open();
  return ask<T[]>(db.transaction(name, "readonly").objectStore(name).getAll());
}

export async function put<T>(name: StoreName, value: T): Promise<void> {
  const db = await open();
  const tx = db.transaction(name, "readwrite");
  tx.objectStore(name).put(value);
  await done(tx);
}

/** Writes several records in one transaction, so a reorder lands atomically. */
export async function putMany<T>(name: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return;
  const db = await open();
  const tx = db.transaction(name, "readwrite");
  for (const value of values) tx.objectStore(name).put(value);
  await done(tx);
}

export async function remove(name: StoreName, id: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(name, "readwrite");
  tx.objectStore(name).delete(id);
  await done(tx);
}

/** Deletes a group together with its trackers and their logged entries. */
export async function removeGroupCascade(groupId: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(
    [STORES.groups, STORES.trackers, STORES.entries],
    "readwrite"
  );
  const trackers = tx.objectStore(STORES.trackers);
  const entries = tx.objectStore(STORES.entries);

  tx.objectStore(STORES.groups).delete(groupId);

  const ids = await ask<IDBValidKey[]>(
    trackers.index("groupId").getAllKeys(groupId)
  );
  for (const id of ids) {
    trackers.delete(id);
    const entryIds = await ask<IDBValidKey[]>(
      entries.index("trackerId").getAllKeys(id as string)
    );
    for (const entryId of entryIds) entries.delete(entryId);
  }

  await done(tx);
}

/**
 * Writes a tracker and, in the same transaction, deletes the entries of any
 * variant it has dropped — entries name their variant by id alone, so an
 * orphaned one could never be read back.
 */
export async function saveTracker(
  tracker: Tracker,
  droppedVariantIds: string[]
): Promise<void> {
  const db = await open();
  const tx = db.transaction([STORES.trackers, STORES.entries], "readwrite");
  tx.objectStore(STORES.trackers).put(tracker);

  if (droppedVariantIds.length > 0) {
    const dropped = new Set(droppedVariantIds);
    const entries = tx.objectStore(STORES.entries);
    const rows = await ask<Entry[]>(
      entries.index("trackerId").getAll(tracker.id)
    );
    for (const row of rows)
      if (dropped.has(row.variantId)) entries.delete(row.id);
  }

  await done(tx);
}

/** Deletes a tracker together with its logged entries. */
export async function removeTrackerCascade(trackerId: string): Promise<void> {
  const db = await open();
  const tx = db.transaction([STORES.trackers, STORES.entries], "readwrite");
  const entries = tx.objectStore(STORES.entries);

  tx.objectStore(STORES.trackers).delete(trackerId);
  for (const entryId of await ask<IDBValidKey[]>(
    entries.index("trackerId").getAllKeys(trackerId)
  )) {
    entries.delete(entryId);
  }

  await done(tx);
}

/**
 * Swaps the entire contents in one transaction: an import that fails partway
 * would otherwise leave a plan whose entries belong to a different one.
 */
export async function replaceAll(data: {
  groups: Group[]
  trackers: Tracker[]
  entries: Entry[]
}): Promise<void> {
  const db = await open()
  const names = [STORES.groups, STORES.trackers, STORES.entries]
  const tx = db.transaction(names, 'readwrite')

  for (const name of names) tx.objectStore(name).clear()
  for (const group of data.groups) tx.objectStore(STORES.groups).put(group)
  for (const tracker of data.trackers) tx.objectStore(STORES.trackers).put(tracker)
  for (const entry of data.entries) tx.objectStore(STORES.entries).put(entry)

  await done(tx)
}

export async function loadAll(): Promise<{
  groups: Group[];
  trackers: Tracker[];
  entries: Entry[];
}> {
  const [groups, trackers, entries] = await Promise.all([
    getAll<Group>(STORES.groups),
    getAll<Tracker>(STORES.trackers),
    getAll<Entry>(STORES.entries),
  ]);
  return { groups, trackers, entries };
}

/**
 * Seeds the starting plan on a first run, and re-seeds whenever SCHEMA has
 * moved on — the pre-release stand-in for migrations, so a shape change never
 * leaves half-old records behind. A matching stamp is left alone, so deleting
 * every group does not bring the plan back.
 *
 * The check, the wipe and the write are one transaction, and the promise is
 * cached, so concurrent callers (Strict Mode mounts effects twice) cannot seed
 * twice.
 */
let seeding: Promise<void> | null = null;

export function ensureSchema(
  build: () => { groups: Group[]; trackers: Tracker[] }
): Promise<void> {
  seeding ??= (async () => {
    const db = await open();
    const names = [STORES.meta, STORES.groups, STORES.trackers, STORES.entries];
    const tx = db.transaction(names, "readwrite");
    const meta = tx.objectStore(STORES.meta);

    const stamp = (await ask(meta.get("schema"))) as
      | { schema?: number }
      | undefined;

    if (stamp?.schema !== SCHEMA) {
      for (const name of names) tx.objectStore(name).clear();

      const { groups, trackers } = build();
      for (const group of groups) tx.objectStore(STORES.groups).put(group);
      for (const tracker of trackers)
        tx.objectStore(STORES.trackers).put(tracker);
      meta.put({ key: "schema", schema: SCHEMA, at: Date.now() });
    }

    await done(tx);
  })();

  return seeding;
}
