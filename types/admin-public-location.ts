import type { AdminActor } from "@/types/admin";

export const PUBLIC_LOCATION_TEXT_MAX_LENGTH = 500;

export type AdminPublicLocationErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "INVALID_ADMIN_PUBLIC_LOCATION_REQUEST"
  | "ADMIN_PUBLIC_LOCATION_MAP_URL_NOT_ALLOWED"
  | "ADMIN_PUBLIC_LOCATION_STALE"
  | "ADMIN_PUBLIC_LOCATION_UNEXPECTED_ERROR";

export type AdminPublicLocationActor = AdminActor;

export type AdminPublicLocationSettings = Readonly<{
  enabled: boolean;
  publicLocationEs: string;
  publicLocationEn: string;
  mapEmbedUrl: string;
  updatedAt: string | null;
}>;

export type AdminPublicLocationAuditEntry = Readonly<{
  id: string;
  createdAt: string;
  actor: Readonly<{
    name: string | null;
    email: string | null;
  }>;
  changedFields: readonly string[];
  enabledBefore: boolean;
  enabledAfter: boolean;
}>;

export type AdminPublicLocationPageData = Readonly<{
  settings: AdminPublicLocationSettings;
  history: readonly AdminPublicLocationAuditEntry[];
}>;

export type UpdateAdminPublicLocationInput = Readonly<{
  expectedUpdatedAt: string | null;
  enabled: boolean;
  publicLocationEs: string;
  publicLocationEn: string;
  mapEmbedUrl: string;
}>;

export type AdminPublicLocationApiResponse =
  | Readonly<{ pageData: AdminPublicLocationPageData }>
  | Readonly<{
      error: Readonly<{ code: AdminPublicLocationErrorCode }>;
    }>;
