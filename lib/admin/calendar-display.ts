import type { AdminCalendarEntry } from "@/types/admin-calendar";

export type AdminCalendarDisplaySource =
  | AdminCalendarEntry["source"]
  | "AIRBNB_PREPARATION";

export type AdminCalendarDisplayEntry = Readonly<{
  id: string;
  source: AdminCalendarDisplaySource;
  entries: readonly AdminCalendarEntry[];
  blocking: boolean;
  inherited: boolean;
}>;

const AIRBNB_FAMILY_SOURCES = new Set<AdminCalendarDisplaySource>([
  "AIRBNB",
  "AIRBNB_PREPARATION",
]);

function uniqueEntries(
  entries: readonly AdminCalendarEntry[],
): readonly AdminCalendarEntry[] {
  const byId = new Map<string, AdminCalendarEntry>();

  entries.forEach((entry) => {
    byId.set(entry.id, entry);
  });

  return [...byId.values()];
}

function buildDisplayEntry(
  source: AdminCalendarDisplaySource,
  entries: readonly AdminCalendarEntry[],
): AdminCalendarDisplayEntry {
  const normalizedEntries = uniqueEntries(entries);
  const stableIds = normalizedEntries
    .map((entry) => entry.id)
    .sort((left, right) => left.localeCompare(right));

  return {
    id: `${source}:${stableIds.join("|")}`,
    source,
    entries: normalizedEntries,
    blocking: normalizedEntries.some((entry) => entry.blocking),
    inherited:
      normalizedEntries.length > 0 &&
      normalizedEntries.every((entry) => entry.inherited),
  };
}

function mergeAirbnbFamily(
  entries: readonly AdminCalendarDisplayEntry[],
): readonly AdminCalendarDisplayEntry[] {
  const airbnbEntries = entries.filter((entry) =>
    AIRBNB_FAMILY_SOURCES.has(entry.source),
  );

  if (airbnbEntries.length === 0) {
    return entries;
  }

  const source: AdminCalendarDisplaySource = airbnbEntries.some(
    (entry) => entry.source === "AIRBNB_PREPARATION",
  )
    ? "AIRBNB_PREPARATION"
    : "AIRBNB";
  const firstAirbnbIndex = entries.findIndex((entry) =>
    AIRBNB_FAMILY_SOURCES.has(entry.source),
  );
  const mergedAirbnbEntry = buildDisplayEntry(
    source,
    airbnbEntries.flatMap((entry) => entry.entries),
  );

  return entries.flatMap((entry, index) => {
    if (!AIRBNB_FAMILY_SOURCES.has(entry.source)) {
      return [entry];
    }

    return index === firstAirbnbIndex ? [mergedAirbnbEntry] : [];
  });
}

export function consolidateAdminCalendarEntries(
  entries: readonly AdminCalendarEntry[],
): readonly AdminCalendarDisplayEntry[] {
  const groupedEntryByRawId = new Map<string, AdminCalendarDisplayEntry>();
  const airbnbEntriesByProperty = new Map<string, AdminCalendarEntry[]>();
  const preparationEntriesByProperty = new Map<string, AdminCalendarEntry[]>();

  entries.forEach((entry) => {
    if (!entry.blocking) {
      return;
    }

    if (entry.source === "AIRBNB") {
      const current = airbnbEntriesByProperty.get(entry.originPropertyId) ?? [];
      current.push(entry);
      airbnbEntriesByProperty.set(entry.originPropertyId, current);
      return;
    }

    if (entry.source === "PREPARATION_BUFFER") {
      const current =
        preparationEntriesByProperty.get(entry.originPropertyId) ?? [];
      current.push(entry);
      preparationEntriesByProperty.set(entry.originPropertyId, current);
    }
  });

  for (const [propertyId, airbnbEntries] of airbnbEntriesByProperty.entries()) {
    const preparationEntries =
      preparationEntriesByProperty.get(propertyId) ?? [];

    if (preparationEntries.length === 0) {
      continue;
    }

    const groupedEntries = [...airbnbEntries, ...preparationEntries];
    const displayEntry = buildDisplayEntry(
      "AIRBNB_PREPARATION",
      groupedEntries,
    );

    groupedEntries.forEach((entry) => {
      groupedEntryByRawId.set(entry.id, displayEntry);
    });
  }

  const emittedDisplayIds = new Set<string>();
  const displayEntries: AdminCalendarDisplayEntry[] = [];

  entries.forEach((entry) => {
    const groupedEntry = groupedEntryByRawId.get(entry.id);

    if (groupedEntry) {
      if (!emittedDisplayIds.has(groupedEntry.id)) {
        displayEntries.push(groupedEntry);
        emittedDisplayIds.add(groupedEntry.id);
      }
      return;
    }

    displayEntries.push(buildDisplayEntry(entry.source, [entry]));
  });

  return mergeAirbnbFamily(displayEntries);
}
