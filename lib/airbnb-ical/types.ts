import type { CalendarSyncTriggeredBy } from "@prisma/client";

import type { AvailabilityDateRange, DateOnlyString } from "@/types/availability";

export type AirbnbIcalImportedEventStatus = "ACTIVE" | "CANCELLED";

export type AirbnbIcalImportedEvent = AvailabilityDateRange &
  Readonly<{
    providerEventUid: string;
    summary?: string;
    status: AirbnbIcalImportedEventStatus;
  }>;

export type AirbnbIcalParseResult = Readonly<{
  events: readonly AirbnbIcalImportedEvent[];
  skippedEvents: number;
}>;

export type AirbnbIcalFetchOptions = Readonly<{
  timeoutMs: number;
}>;

export type AirbnbIcalFetchClient = (
  url: string,
  options: AirbnbIcalFetchOptions,
) => Promise<string>;

export type AirbnbIcalImportSyncInput = Readonly<{
  externalCalendarId: string;
  decryptedImportUrl: string;
  triggeredBy?: CalendarSyncTriggeredBy;
  timeoutMs?: number;
}>;

export type AirbnbIcalImportSyncResult = Readonly<{
  externalCalendarId: string;
  syncLogId: string;
  eventsImported: number;
  eventsUpdated: number;
  eventsRemoved: number;
  eventsSkipped: number;
  blocksCreated: number;
  blocksUpdated: number;
}>;

export type AirbnbIcalDateRange = Readonly<{
  startDate: DateOnlyString;
  endDate: DateOnlyString;
}>;

export type AirbnbIcalExportFeedInput = Readonly<{
  token: string;
  lookbackDays?: number;
  lookaheadDays?: number;
}>;

export type AirbnbIcalExportUnavailableRange = AvailabilityDateRange;

export type AirbnbIcalExportFeedResult = Readonly<{
  externalCalendarId: string;
  generatedAt: Date;
  range: AvailabilityDateRange;
  eventCount: number;
  content: string;
}>;

export type AirbnbIcalImportUrlResolverCalendar = Readonly<{
  id: string;
  propertyId: string;
  name: string;
  importUrlEncrypted?: string | null;
}>;

export type AirbnbIcalImportUrlResolver = (
  calendar: AirbnbIcalImportUrlResolverCalendar,
) => string | null | undefined | Promise<string | null | undefined>;

export type AirbnbIcalBatchSyncInput = Readonly<{
  externalCalendarIds?: readonly string[];
  triggeredBy?: CalendarSyncTriggeredBy;
  timeoutMs?: number;
}>;

export type AirbnbIcalBatchSyncCalendarStatus = "SUCCESS" | "FAILED" | "SKIPPED";

export type AirbnbIcalBatchSyncCalendarResult = Readonly<{
  externalCalendarId: string;
  syncLogId?: string;
  status: AirbnbIcalBatchSyncCalendarStatus;
  errorCode?: string;
  errorMessage?: string;
  eventsImported: number;
  eventsUpdated: number;
  eventsRemoved: number;
  eventsSkipped: number;
  blocksCreated: number;
  blocksUpdated: number;
}>;

export type AirbnbIcalBatchSyncResult = Readonly<{
  triggeredBy: CalendarSyncTriggeredBy;
  calendarsFound: number;
  calendarsSynced: number;
  calendarsFailed: number;
  calendarsSkipped: number;
  results: readonly AirbnbIcalBatchSyncCalendarResult[];
}>;
