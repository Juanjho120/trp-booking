import type { AdminActor } from "@/types/admin";

export const ARRIVAL_INSTRUCTIONS_DEFAULT_LEAD_TIME_HOURS = 48;
export const ARRIVAL_INSTRUCTIONS_MIN_LEAD_TIME_HOURS = 1;
export const ARRIVAL_INSTRUCTIONS_MAX_LEAD_TIME_HOURS = 168;

export type AdminArrivalInstructionsErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "INVALID_ADMIN_ARRIVAL_INSTRUCTIONS_REQUEST"
  | "ADMIN_ARRIVAL_INSTRUCTIONS_PROPERTY_NOT_FOUND"
  | "ADMIN_ARRIVAL_INSTRUCTIONS_STALE"
  | "ADMIN_ARRIVAL_INSTRUCTIONS_UNEXPECTED_ERROR";

export type AdminArrivalInstructionsActor = AdminActor;

export type AdminArrivalInstructionsProperty = Readonly<{
  propertyId: string;
  propertyNameEs: string;
  propertyNameEn: string;
  checkInTime: string;
  enabled: boolean;
  leadTimeHours: number;
  exactAddress: string;
  mapUrl: string;
  instructionsEs: string;
  instructionsEn: string;
  updatedAt: string | null;
}>;

export type UpdateAdminArrivalInstructionsInput = Readonly<{
  propertyId: string;
  expectedUpdatedAt: string | null;
  enabled: boolean;
  leadTimeHours: number;
  exactAddress: string;
  mapUrl: string;
  instructionsEs: string;
  instructionsEn: string;
}>;
