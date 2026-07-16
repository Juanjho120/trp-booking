import type { AdminActor, AdminPropertyOption } from "@/types/admin";
import type { DateOnlyString } from "@/types/availability";

export type AdminCalendarEntrySource =
  | "DIRECT_RESERVATION"
  | "PENDING_PAYMENT"
  | "AIRBNB"
  | "MANUAL_BLOCK"
  | "MAINTENANCE"
  | "COMPOSED_LISTING_DEPENDENCY"
  | "PREPARATION_BUFFER"
  | "PREPARATION_BUFFER_OVERRIDE";

export type AdminCalendarEntry = Readonly<{
  id: string;
  source: AdminCalendarEntrySource;
  blocking: boolean;
  inherited: boolean;
  originPropertyId: string;
  originPropertyNameEs: string;
  originPropertyNameEn: string;
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  reservationId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  calendarBlockId: string | null;
  externalCalendarEventId: string | null;
  note: string | null;
  canUnlockPreparation: boolean;
  canRestorePreparation: boolean;
  canReleaseManualDay: boolean;
}>;

export type AdminCalendarDay = Readonly<{
  date: DateOnlyString;
  inCurrentMonth: boolean;
  isPast: boolean;
  blockingCount: number;
  entries: readonly AdminCalendarEntry[];
}>;

export type AdminPropertyCalendar = Readonly<{
  generatedAt: string;
  month: string;
  today: DateOnlyString;
  range: Readonly<{
    startDate: DateOnlyString;
    endDate: DateOnlyString;
  }>;
  selectedProperty: AdminPropertyOption;
  properties: readonly AdminPropertyOption[];
  days: readonly AdminCalendarDay[];
}>;

export type AdminCalendarActor = AdminActor;

export type GetAdminPropertyCalendarInput = Readonly<{
  propertyId: string;
  month: string;
}>;

export type CreateAdminManualBlockInput = Readonly<{
  propertyId: string;
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  note?: string | null;
}>;

export type ReleaseAdminManualBlockDayInput = Readonly<{
  calendarBlockId: string;
  date: DateOnlyString;
}>;

export type AdminCalendarMutationResult = Readonly<{
  calendarBlockId: string;
}>;

export const adminCalendarErrorCodes = [
  "ADMIN_UNAUTHORIZED",
  "INVALID_ADMIN_CALENDAR_REQUEST",
  "ADMIN_CALENDAR_PROPERTY_NOT_FOUND",
  "ADMIN_CALENDAR_DATE_IN_PAST",
  "ADMIN_CALENDAR_MANUAL_BLOCK_NOT_FOUND",
  "ADMIN_CALENDAR_DAY_NOT_IN_BLOCK",
  "ADMIN_CALENDAR_UNEXPECTED_ERROR",
] as const;

export type AdminCalendarErrorCode =
  (typeof adminCalendarErrorCodes)[number];
