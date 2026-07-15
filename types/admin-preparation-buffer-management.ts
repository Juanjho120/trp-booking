import type { DateOnlyString, PreparationBufferRangeKind } from "@/types/availability";

export type AdminPreparationBufferProperty = Readonly<{
  id: string;
  nameEs: string;
  nameEn: string;
  preparationDaysBefore: number;
  preparationDaysAfter: number;
  updatedAt: string;
}>;

export type AdminPreparationBufferDay = Readonly<{
  date: DateOnlyString;
  kind: PreparationBufferRangeKind;
  isUnlocked: boolean;
  overrideId: string | null;
  overrideReason: string | null;
  unlockedAt: string | null;
  unlockedByName: string | null;
  unlockedByEmail: string | null;
}>;

export type AdminPreparationBufferReservation = Readonly<{
  id: string;
  propertyId: string;
  propertyNameEs: string;
  propertyNameEn: string;
  guestName: string;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  bufferDays: readonly AdminPreparationBufferDay[];
}>;

export type AdminPreparationBufferManagement = Readonly<{
  generatedAt: string;
  properties: readonly AdminPreparationBufferProperty[];
  reservations: readonly AdminPreparationBufferReservation[];
}>;

export type AdminPreparationBufferActor = Readonly<{
  email: string;
  name?: string | null;
}>;

export type UpdateAdminPreparationBufferSettingsInput = Readonly<{
  propertyId: string;
  preparationDaysBefore: number;
  preparationDaysAfter: number;
}>;

export type UnlockAdminPreparationBufferDayInput = Readonly<{
  reservationId: string;
  date: DateOnlyString;
  reason: string;
}>;

export const adminPreparationBufferErrorCodes = [
  "ADMIN_UNAUTHORIZED",
  "INVALID_PREPARATION_BUFFER_REQUEST",
  "PREPARATION_BUFFER_PROPERTY_NOT_FOUND",
  "PREPARATION_BUFFER_RESERVATION_NOT_FOUND",
  "PREPARATION_BUFFER_RESERVATION_NOT_CONFIRMED",
  "PREPARATION_BUFFER_DATE_NOT_UNLOCKABLE",
  "PREPARATION_BUFFER_DATE_IN_PAST",
  "PREPARATION_BUFFER_REASON_REQUIRED",
  "PREPARATION_BUFFER_UNEXPECTED_ERROR",
] as const;

export type AdminPreparationBufferErrorCode =
  (typeof adminPreparationBufferErrorCodes)[number];
