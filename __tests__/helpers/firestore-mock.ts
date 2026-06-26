/**
 * In-memory Firestore mock that supports the subset of the Firestore Admin SDK
 * used by the quizche API routes.
 *
 * Supports: collection().doc().{get,set,update,delete},
 * collection().add(), collection().where().{orderBy,limit,startAfter}.get(),
 * collection().get(), batch operations and runTransaction.
 *
 * Each collection stores documents keyed by doc id. Dates are stored as-is
 * (the routes call `.toDate()` on timestamp-like values, so we expose a helper
 * via `makeTimestamp()` that returns an object with `toDate()`).
 */

export type FirestoreValue =
  | string
  | number
  | boolean
  | null
  | Date
  | { toDate: () => Date }
  | FirestoreValue[]
  | { [key: string]: FirestoreValue };

type DocStore = Map<string, FirestoreValue>;

/** A Firestore-like timestamp that supports `.toDate()`. */
export const makeTimestamp = (
  date: Date = new Date()
): Date & {
  toDate: () => Date;
} => {
  const d = new Date(date) as Date & { toDate: () => Date };
  d.toDate = () => d;
  return d;
};

type MockDocSnapshot = {
  id: string;
  exists: boolean;
  data: () => FirestoreValue | undefined;
  ref: MockDocRef;
};

type MockQuerySnapshot = {
  empty: boolean;
  size: number;
  docs: MockDocSnapshot[];
  forEach: (cb: (doc: MockDocSnapshot) => void) => void;
};

type MockDocRef = {
  id: string;
  get: () => Promise<MockDocSnapshot>;
  set: (data: FirestoreValue, options?: { merge?: boolean }) => Promise<void>;
  update: (data: FirestoreValue) => Promise<void>;
  delete: () => Promise<void>;
};

type MockQuery = {
  where: (field: string, op: string, value: unknown) => MockQuery;
  orderBy: (field: string, direction?: string) => MockQuery;
  limit: (n: number) => MockQuery;
  startAfter: (doc: unknown) => MockQuery;
  get: () => Promise<MockQuerySnapshot>;
};

type MockBatch = {
  set: (ref: MockDocRef, data: FirestoreValue) => void;
  update: (ref: MockDocRef, data: FirestoreValue) => void;
  delete: (ref: MockDocRef) => void;
  commit: () => Promise<void>;
};

type MockCollectionRef = {
  doc: (id?: string) => MockDocRef;
  add: (data: FirestoreValue) => Promise<{ id: string }>;
  where: (field: string, op: string, value: unknown) => MockQuery;
  orderBy: (field: string, direction?: string) => MockQuery;
  limit: (n: number) => MockQuery;
  get: () => Promise<MockQuerySnapshot>;
};

type Filter = {
  field: string;
  op: string;
  value: unknown;
};

type OrderBy = {
  field: string;
  direction: string;
};

let idCounter = 0;
const generateId = (): string => {
  idCounter += 1;
  return `mock-id-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
};

/**
 * Deep clone helper that also converts plain Date objects into timestamp-like
 * objects so the `.toDate()` calls in route handlers don't blow up.
 */
const cloneValue = (value: unknown): FirestoreValue => {
  if (value instanceof Date) {
    return makeTimestamp(value);
  }
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, FirestoreValue> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = cloneValue((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value as FirestoreValue;
};

/** Merge `patch` into `base` recursively (one level deep like Firestore merge). */
const mergeValues = (
  base: Record<string, FirestoreValue>,
  patch: Record<string, FirestoreValue>
): Record<string, FirestoreValue> => {
  const out: Record<string, FirestoreValue> = { ...base };
  for (const key of Object.keys(patch)) {
    const patchVal = patch[key];
    if (
      patchVal !== null &&
      typeof patchVal === "object" &&
      !Array.isArray(patchVal) &&
      !(patchVal instanceof Date) &&
      out[key] !== null &&
      typeof out[key] === "object" &&
      !Array.isArray(out[key]) &&
      !(out[key] instanceof Date)
    ) {
      out[key] = mergeValues(
        out[key] as Record<string, FirestoreValue>,
        patchVal as Record<string, FirestoreValue>
      );
    } else {
      out[key] = patchVal;
    }
  }
  return out;
};

const matchFilter = (docData: FirestoreValue, filter: Filter): boolean => {
  if (
    docData === null ||
    typeof docData !== "object" ||
    Array.isArray(docData)
  ) {
    return false;
  }
  const record = docData as Record<string, FirestoreValue>;
  const fieldValue = record[filter.field];
  switch (filter.op) {
    case "==":
      return fieldValue === filter.value;
    case "!=":
      return fieldValue !== filter.value;
    case ">":
      return (
        typeof fieldValue === "number" &&
        typeof filter.value === "number" &&
        fieldValue > filter.value
      );
    case ">=":
      return (
        typeof fieldValue === "number" &&
        typeof filter.value === "number" &&
        fieldValue >= filter.value
      );
    case "<":
      return (
        typeof fieldValue === "number" &&
        typeof filter.value === "number" &&
        fieldValue < filter.value
      );
    case "<=":
      return (
        typeof fieldValue === "number" &&
        typeof filter.value === "number" &&
        fieldValue <= filter.value
      );
    case "in":
      if (!Array.isArray(filter.value)) return false;
      return (filter.value as FirestoreValue[]).includes(fieldValue);
    case "array-contains":
      return (
        Array.isArray(fieldValue) &&
        (fieldValue as FirestoreValue[]).includes(
          filter.value as FirestoreValue
        )
      );
    default:
      return false;
  }
};

const toComparable = (value: unknown): number | string => {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (value !== null && typeof value === "object" && "toDate" in value) {
    const fn = (value as { toDate: unknown }).toDate;
    if (typeof fn === "function") {
      const d = (fn as () => Date)();
      return d.getTime();
    }
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  // For objects without toDate, use JSON.stringify for comparison
  return JSON.stringify(value);
};

export type FirestoreMock = {
  collection: (name: string) => MockCollectionRef;
  batch: () => MockBatch;
  runTransaction: <T>(
    fn: (transaction: {
      get: (ref: MockDocRef) => Promise<MockDocSnapshot>;
      set: (ref: MockDocRef, data: FirestoreValue) => void;
      update: (ref: MockDocRef, data: FirestoreValue) => void;
      delete: (ref: MockDocRef) => void;
    }) => Promise<T>
  ) => Promise<T>;
  /** Direct access to the in-memory store for test setup. */
  _store: Map<string, DocStore>;
  /** Seed a document, returning its id. */
  _seed: (
    collection: string,
    id: string | undefined,
    data: FirestoreValue
  ) => string;
  /** Clear all data. */
  _reset: () => void;
};

export const createFirestoreMock = (): FirestoreMock => {
  const store = new Map<string, DocStore>();

  const getCollection = (name: string): DocStore => {
    let col = store.get(name);
    if (!col) {
      col = new Map();
      store.set(name, col);
    }
    return col;
  };

  const makeDocRef = (collectionName: string, docId: string): MockDocRef => {
    return {
      id: docId,
      get() {
        const col = getCollection(collectionName);
        const data = col.get(docId);
        return Promise.resolve({
          id: docId,
          exists: data !== undefined,
          data: () => data,
          ref: makeDocRef(collectionName, docId),
        });
      },
      set(data, options) {
        const col = getCollection(collectionName);
        const cloned = cloneValue(data) as Record<string, FirestoreValue>;
        const existing = col.get(docId) as
          | Record<string, FirestoreValue>
          | undefined;
        if (options?.merge === true && existing) {
          col.set(docId, mergeValues(existing, cloned));
        } else {
          col.set(docId, cloned);
        }
        return Promise.resolve();
      },
      update(data) {
        const col = getCollection(collectionName);
        const cloned = cloneValue(data) as Record<string, FirestoreValue>;
        const existing = (col.get(docId) ?? {}) as Record<
          string,
          FirestoreValue
        >;
        col.set(docId, mergeValues(existing, cloned));
        return Promise.resolve();
      },
      delete() {
        const col = getCollection(collectionName);
        col.delete(docId);
        return Promise.resolve();
      },
    };
  };

  const buildQuery = (
    collectionName: string,
    filters: Filter[],
    orders: OrderBy[],
    limitVal: number | null,
    startAfterDoc: MockDocSnapshot | null
  ): MockQuery => {
    const query: MockQuery = {
      where(field, op, value) {
        return buildQuery(
          collectionName,
          [...filters, { field, op, value }],
          orders,
          limitVal,
          startAfterDoc
        );
      },
      orderBy(field, direction = "asc") {
        return buildQuery(
          collectionName,
          filters,
          [...orders, { field, direction }],
          limitVal,
          startAfterDoc
        );
      },
      limit(n) {
        return buildQuery(collectionName, filters, orders, n, startAfterDoc);
      },
      startAfter(doc) {
        return buildQuery(
          collectionName,
          filters,
          orders,
          limitVal,
          doc as MockDocSnapshot
        );
      },
      get() {
        const col = getCollection(collectionName);
        let entries = Array.from(col.entries());

        // Apply filters
        for (const filter of filters) {
          entries = entries.filter(([, data]) => matchFilter(data, filter));
        }

        let docs: MockDocSnapshot[] = entries.map(([id, data]) => ({
          id,
          exists: true,
          data: () => data,
          ref: makeDocRef(collectionName, id),
        }));

        // Apply ordering
        for (const order of orders) {
          docs.sort((a, b) => {
            const aVal = toComparable(
              (a.data() as Record<string, FirestoreValue>)[order.field]
            );
            const bVal = toComparable(
              (b.data() as Record<string, FirestoreValue>)[order.field]
            );
            if (aVal < bVal) return order.direction === "desc" ? 1 : -1;
            if (aVal > bVal) return order.direction === "desc" ? -1 : 1;
            return 0;
          });
        }

        // Apply startAfter cursor
        if (startAfterDoc) {
          const startIndex = docs.findIndex((d) => d.id === startAfterDoc.id);
          if (startIndex !== -1) {
            docs = docs.slice(startIndex + 1);
          }
        }

        // Apply limit
        if (limitVal !== null) {
          docs = docs.slice(0, limitVal);
        }

        return Promise.resolve({
          empty: docs.length === 0,
          size: docs.length,
          docs,
          forEach: (cb: (doc: MockDocSnapshot) => void) => docs.forEach(cb),
        });
      },
    };
    return query;
  };

  const collection = (name: string): MockCollectionRef => {
    return {
      doc(id) {
        return makeDocRef(name, id ?? generateId());
      },
      add(data) {
        const id = generateId();
        const col = getCollection(name);
        col.set(id, cloneValue(data) as Record<string, FirestoreValue>);
        return Promise.resolve({ id });
      },
      where(field, op, value) {
        return buildQuery(name, [{ field, op, value }], [], null, null);
      },
      orderBy(field, direction) {
        return buildQuery(
          name,
          [],
          [{ field, direction: direction ?? "asc" }],
          null,
          null
        );
      },
      limit(n) {
        return buildQuery(name, [], [], n, null);
      },
      get() {
        const col = getCollection(name);
        const docs: MockDocSnapshot[] = Array.from(col.entries()).map(
          ([id, data]) => ({
            id,
            exists: true,
            data: () => data,
            ref: makeDocRef(name, id),
          })
        );
        return Promise.resolve({
          empty: docs.length === 0,
          size: docs.length,
          docs,
          forEach: (cb: (doc: MockDocSnapshot) => void) => docs.forEach(cb),
        });
      },
    };
  };

  const batch = (): MockBatch => {
    const ops: (() => Promise<void>)[] = [];
    return {
      set(ref, data) {
        ops.push(() => ref.set(data));
      },
      update(ref, data) {
        ops.push(() => ref.update(data));
      },
      delete(ref) {
        ops.push(() => ref.delete());
      },
      async commit() {
        await Promise.all(ops.map((op) => op()));
      },
    };
  };

  const runTransaction = async <T>(
    fn: (transaction: {
      get: (ref: MockDocRef) => Promise<MockDocSnapshot>;
      set: (ref: MockDocRef, data: FirestoreValue) => void;
      update: (ref: MockDocRef, data: FirestoreValue) => void;
      delete: (ref: MockDocRef) => void;
    }) => Promise<T>
  ): Promise<T> => {
    const pendingOps: (() => Promise<void>)[] = [];
    const transaction = {
      get: (ref: MockDocRef) => ref.get(),
      set: (ref: MockDocRef, data: FirestoreValue) => {
        pendingOps.push(() => ref.set(data));
      },
      update: (ref: MockDocRef, data: FirestoreValue) => {
        pendingOps.push(() => ref.update(data));
      },
      delete: (ref: MockDocRef) => {
        pendingOps.push(() => ref.delete());
      },
    };
    const result = await fn(transaction);
    await Promise.all(pendingOps.map((op) => op()));
    return result;
  };

  const _seed = (
    collectionName: string,
    id: string | undefined,
    data: FirestoreValue
  ): string => {
    const docId = id ?? generateId();
    const col = getCollection(collectionName);
    col.set(docId, cloneValue(data) as Record<string, FirestoreValue>);
    return docId;
  };

  const _reset = (): void => {
    store.clear();
  };

  return {
    collection,
    batch,
    runTransaction,
    _store: store,
    _seed,
    _reset,
  };
};
