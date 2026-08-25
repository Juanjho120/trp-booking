import type { NextResponse } from "next/server";

import { adminApiErrorResponse } from "./api-response";
import { AdminExternalCalendarInboundError } from "./external-calendar-inbound";
import type { AdminExternalCalendarInboundErrorCode } from "@/types/admin-external-calendar-integration";

export function adminExternalCalendarErrorStatus(
  code: AdminExternalCalendarInboundErrorCode,
): number {
  switch (code) {
    case "ADMIN_UNAUTHORIZED":
      return 401;
    case "ADMIN_EXTERNAL_CALENDAR_ORIGIN_INVALID":
      return 403;
    case "ADMIN_EXTERNAL_CALENDAR_PROPERTY_NOT_FOUND":
    case "ADMIN_EXTERNAL_CALENDAR_NOT_FOUND":
      return 404;
    case "ADMIN_EXTERNAL_CALENDAR_STALE":
      return 409;
    case "ADMIN_EXTERNAL_CALENDAR_PROVIDER_UNAVAILABLE":
      return 503;
    case "ADMIN_EXTERNAL_CALENDAR_IMPORT_TEST_FAILED":
    case "ADMIN_EXTERNAL_CALENDAR_IMPORT_SYNC_FAILED":
      return 502;
    case "INVALID_ADMIN_EXTERNAL_CALENDAR_REQUEST":
    case "ADMIN_EXTERNAL_CALENDAR_IMPORT_URL_NOT_ALLOWED":
    case "ADMIN_EXTERNAL_CALENDAR_IMPORT_NOT_CONFIGURED":
    case "ADMIN_EXTERNAL_CALENDAR_IMPORT_DISABLED":
      return 400;
    case "ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

export function adminExternalCalendarErrorResponse(
  error: unknown,
): NextResponse {
  if (error instanceof AdminExternalCalendarInboundError) {
    return adminApiErrorResponse(
      error.code,
      adminExternalCalendarErrorStatus(error.code),
    );
  }

  return adminApiErrorResponse(
    "ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR",
    500,
  );
}
