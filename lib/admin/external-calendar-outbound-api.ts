import type { NextResponse } from "next/server";

import { adminApiErrorResponse } from "./api-response";
import { AdminExternalCalendarOutboundError } from "./external-calendar-outbound";
import type { AdminExternalCalendarOutboundErrorCode } from "@/types/admin-external-calendar-integration";

export function adminExternalCalendarOutboundErrorStatus(
  code: AdminExternalCalendarOutboundErrorCode,
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
    case "ADMIN_EXTERNAL_CALENDAR_EXPORT_ALREADY_CONFIGURED":
    case "ADMIN_EXTERNAL_CALENDAR_EXPORT_COPY_UNAVAILABLE":
      return 409;
    case "INVALID_ADMIN_EXTERNAL_CALENDAR_REQUEST":
    case "ADMIN_EXTERNAL_CALENDAR_EXPORT_NOT_CONFIGURED":
      return 400;
    case "ADMIN_EXTERNAL_CALENDAR_EXPORT_SECRET_UNAVAILABLE":
    case "ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR":
    default:
      return 500;
  }
}

export function adminExternalCalendarOutboundErrorResponse(
  error: unknown,
): NextResponse {
  if (error instanceof AdminExternalCalendarOutboundError) {
    return adminApiErrorResponse(
      error.code,
      adminExternalCalendarOutboundErrorStatus(error.code),
    );
  }

  return adminApiErrorResponse(
    "ADMIN_EXTERNAL_CALENDAR_UNEXPECTED_ERROR",
    500,
  );
}
