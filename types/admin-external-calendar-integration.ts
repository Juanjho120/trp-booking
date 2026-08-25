export type AdminExternalCalendarProvider = "AIRBNB";

export type AdminExternalCalendarDirection =
  | "IMPORT"
  | "EXPORT"
  | "BIDIRECTIONAL"
  | null;

export type AdminExternalCalendarImportSecretSource =
  | "DATABASE_ENCRYPTED"
  | "LEGACY_ENV"
  | "NONE";

export type AdminExternalCalendarInboundStatus =
  | "NOT_CONFIGURED"
  | "LEGACY_ENV_MIGRATION_REQUIRED"
  | "DISABLED"
  | "READY"
  | "HEALTHY"
  | "WARNING"
  | "ERROR";

export type AdminExternalCalendarOutboundStatus =
  | "NOT_CONFIGURED"
  | "DISABLED"
  | "ROTATION_REQUIRED"
  | "READY";

export type AdminExternalCalendarSyncStatus =
  | "STARTED"
  | "SUCCESS"
  | "FAILED"
  | "PARTIAL_SUCCESS";

export type AdminExternalCalendarSyncTrigger = "CRON" | "ADMIN" | "SYSTEM";

export type AdminExternalCalendarSafeFailure = Readonly<{
  code: string | null;
  message: string | null;
}>;

export type AdminExternalCalendarLatestSync = Readonly<{
  status: AdminExternalCalendarSyncStatus;
  triggeredBy: AdminExternalCalendarSyncTrigger;
  startedAt: string;
  finishedAt: string | null;
  eventsImported: number;
  eventsUpdated: number;
  eventsRemoved: number;
  eventsSkipped: number;
  blocksCreated: number;
  blocksUpdated: number;
}>;

export type AdminExternalCalendarIntegration = Readonly<{
  calendarId: string | null;
  property: Readonly<{
    id: string;
    nameEs: string;
    nameEn: string;
  }>;
  provider: AdminExternalCalendarProvider;
  direction: AdminExternalCalendarDirection;
  importConfigured: boolean;
  importSecretSource: AdminExternalCalendarImportSecretSource;
  isImportEnabled: boolean;
  inboundStatus: AdminExternalCalendarInboundStatus;
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  latestSync: AdminExternalCalendarLatestSync | null;
  safeFailure: AdminExternalCalendarSafeFailure | null;
  exportConfigured: boolean;
  exportCopyAvailable: boolean;
  isExportEnabled: boolean;
  outboundStatus: AdminExternalCalendarOutboundStatus;
  exportTokenLastRotatedAt: string | null;
  lastExportGeneratedAt: string | null;
  updatedAt: string | null;
}>;

export type AdminExternalCalendarIntegrationsPageData = Readonly<{
  integrations: readonly AdminExternalCalendarIntegration[];
}>;

export type AdminExternalCalendarInboundErrorCode =
  | "ADMIN_UNAUTHORIZED"
  | "ADMIN_EXTERNAL_CALENDAR_ORIGIN_INVALID"
  | "INVALID_ADMIN_EXTERNAL_CALENDAR_REQUEST"
  | "ADMIN_EXTERNAL_CALENDAR_PROPERTY_NOT_FOUND"
  | "ADMIN_EXTERNAL_CALENDAR_NOT_FOUND"
  | "ADMIN_EXTERNAL_CALENDAR_IMPORT_URL_NOT_ALLOWED"
  | "ADMIN_EXTERNAL_CALENDAR_IMPORT_NOT_CONFIGURED"
  | "ADMIN_EXTERNAL_CALENDAR_IMPORT_DISABLED"
  | "ADMIN_EXTERNAL_CALENDAR_IMPORT_TEST_FAILED"
  | "ADMIN_EXTERNAL_CALENDAR_IMPORT_SYNC_FAILED"
  | "ADMIN_EXTERNAL_CALENDAR_STALE"
  | "ADMIN_EXTERNAL_CALENDAR_PROVIDER_UNAVAILABLE"
  | "ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR";

export type AdminExternalCalendarTestConnectionResult = Readonly<{
  status: "SUCCESS";
  eventsFound: number;
  eventsSkipped: number;
}>;

export type AdminExternalCalendarInboundApiError = Readonly<{
  error: Readonly<{
    code: AdminExternalCalendarInboundErrorCode;
  }>;
}>;

export type AdminExternalCalendarInboundApiSuccess = Readonly<{
  pageData: AdminExternalCalendarIntegrationsPageData;
  testResult?: AdminExternalCalendarTestConnectionResult;
}>;

export type AdminExternalCalendarInboundApiResponse =
  | AdminExternalCalendarInboundApiSuccess
  | AdminExternalCalendarInboundApiError;
