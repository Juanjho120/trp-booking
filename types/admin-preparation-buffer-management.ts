import type { AdminActor } from "@/types/admin";
import type { DateOnlyString } from "@/types/availability";

export type AdminPreparationBufferProperty = Readonly<{
  id: string;
  nameEs: string;
  nameEn: string;
  preparationDaysBefore: number;
  preparationDaysAfter: number;
  updatedAt: string;
}>;

export type AdminPreparationBufferSettings = Readonly<{
  generatedAt: string;
  properties: readonly AdminPreparationBufferProperty[];
}>;

export type AdminPreparationBufferActor = AdminActor;

export type UpdateAdminPreparationBufferSettingsInput = Readonly<{
  propertyId: string;
  preparationDaysBefore: number;
  preparationDaysAfter: number;
}>;

export type UnlockAdminPreparationBufferDayInput = Readonly<{
  reservationId?: string | null;
  calendarBlockId?: string | null;
  date: DateOnlyString;
  reason?: string | null;
}>;

export type RestoreAdminPreparationBufferDayInput = Readonly<{
  overrideId: string;
}>;

export type AdminPreparationBufferMutationResult = Readonly<{
  calendarBlockId: string;
}>;

export const adminPreparationBufferErrorCodes = [
  "ADMIN_UNAUTHORIZED",
  "INVALID_PREPARATION_BUFFER_REQUEST",
  "PREPARATION_BUFFER_PROPERTY_NOT_FOUND",
  "PREPARATION_BUFFER_RESERVATION_NOT_FOUND",
  "PREPARATION_BUFFER_RESERVATION_NOT_CONFIRMED",
  "PREPARATION_BUFFER_DATE_NOT_UNLOCKABLE",
  "PREPARATION_BUFFER_DATE_IN_PAST",
  "PREPARATION_BUFFER_OVERRIDE_NOT_FOUND",
  "PREPARATION_BUFFER_UNEXPECTED_ERROR",
] as const;

export type AdminPreparationBufferErrorCode =
  (typeof adminPreparationBufferErrorCodes)[number];
