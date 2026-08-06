import { CalendarSyncTriggeredBy } from "@prisma/client";

import { syncConfiguredAirbnbIcalImports } from "@/lib/airbnb-ical/scheduled-sync";
import {
  processEmailNotifications,
  scheduleArrivalInstructionsNotifications,
} from "@/lib/email";
import { expirePendingReservationHolds } from "@/lib/reservations/expiration";
import { expireDueLifecycleAdjustmentHolds } from "@/lib/reservations/lifecycle-adjustment-holds";
import type {
  CronJobExecutionResult,
  CronJobKeyValue,
  CronJobSlug,
  CronJobTriggerSourceValue,
} from "@/types/cron-job";

export type CronJobDefinition = Readonly<{
  key: CronJobKeyValue;
  slug: CronJobSlug;
  schedule: string;
  safeUnexpectedErrorCode: string;
  safeUnexpectedErrorMessage: string;
  execute: (
    triggerSource: CronJobTriggerSourceValue,
  ) => Promise<CronJobExecutionResult>;
}>;

function successfulResult(
  result: CronJobExecutionResult["result"],
): CronJobExecutionResult {
  return {
    status: "SUCCESS",
    result,
    errorCode: null,
    errorMessage: null,
  };
}

const definitions: readonly CronJobDefinition[] = [
  {
    key: "SYNC_AIRBNB_CALENDARS",
    slug: "sync-airbnb-calendars",
    schedule: "*/30 * * * *",
    safeUnexpectedErrorCode: "AIRBNB_CALENDAR_SYNC_UNEXPECTED_ERROR",
    safeUnexpectedErrorMessage:
      "Airbnb calendar synchronization could not be completed.",
    async execute(triggerSource) {
      const result = await syncConfiguredAirbnbIcalImports({
        triggeredBy:
          triggerSource === "MANUAL"
            ? CalendarSyncTriggeredBy.ADMIN
            : CalendarSyncTriggeredBy.CRON,
      });
      const safeResult = {
        calendarsFound: result.calendarsFound,
        calendarsSynced: result.calendarsSynced,
        calendarsFailed: result.calendarsFailed,
        calendarsSkipped: result.calendarsSkipped,
        results: result.results.map((calendar) => ({
          externalCalendarId: calendar.externalCalendarId,
          syncLogId: calendar.syncLogId ?? null,
          status: calendar.status,
          errorCode: calendar.errorCode ?? null,
          eventsImported: calendar.eventsImported,
          eventsUpdated: calendar.eventsUpdated,
          eventsRemoved: calendar.eventsRemoved,
          eventsSkipped: calendar.eventsSkipped,
          blocksCreated: calendar.blocksCreated,
          blocksUpdated: calendar.blocksUpdated,
        })),
      } as const;

      return {
        status:
          result.calendarsFailed > 0 ? "PARTIAL_SUCCESS" : "SUCCESS",
        result: safeResult,
        errorCode:
          result.calendarsFailed > 0
            ? "AIRBNB_CALENDAR_SYNC_PARTIAL_SUCCESS"
            : null,
        errorMessage:
          result.calendarsFailed > 0
            ? "One or more Airbnb calendars could not be synchronized."
            : null,
      };
    },
  },
  {
    key: "EXPIRE_PENDING_RESERVATION_HOLDS",
    slug: "expire-pending-reservation-holds",
    schedule: "*/5 * * * *",
    safeUnexpectedErrorCode: "PENDING_HOLD_EXPIRATION_UNEXPECTED_ERROR",
    safeUnexpectedErrorMessage:
      "Pending reservation hold expiration could not be completed.",
    async execute() {
      const publicResult = await expirePendingReservationHolds();
      const lifecycleResult = await expireDueLifecycleAdjustmentHolds(
        new Date(publicResult.expiredAt),
      );

      return successfulResult({
        expiredCount: publicResult.expiredCount,
        lifecycleAdjustmentExpiredCount: lifecycleResult.expiredCount,
        expiredAt: publicResult.expiredAt,
      });
    },
  },
  {
    key: "PROCESS_EMAIL_NOTIFICATIONS",
    slug: "process-email-notifications",
    schedule: "*/5 * * * *",
    safeUnexpectedErrorCode: "EMAIL_NOTIFICATION_PROCESSING_UNEXPECTED_ERROR",
    safeUnexpectedErrorMessage:
      "Email notification processing could not be completed.",
    async execute() {
      const result = await processEmailNotifications();

      if (result.deliveryMode === "unavailable") {
        return {
          status: "FAILED",
          result,
          errorCode: "EMAIL_DELIVERY_UNAVAILABLE",
          errorMessage: "Email delivery is currently unavailable.",
        };
      }

      return {
        status: result.failed > 0 ? "PARTIAL_SUCCESS" : "SUCCESS",
        result,
        errorCode:
          result.failed > 0
            ? "EMAIL_NOTIFICATION_PROCESSING_PARTIAL_SUCCESS"
            : null,
        errorMessage:
          result.failed > 0
            ? "One or more email notifications could not be processed."
            : null,
      };
    },
  },
  {
    key: "SCHEDULE_ARRIVAL_INSTRUCTIONS",
    slug: "schedule-arrival-instructions",
    schedule: "*/30 * * * *",
    safeUnexpectedErrorCode: "ARRIVAL_INSTRUCTION_SCHEDULING_UNEXPECTED_ERROR",
    safeUnexpectedErrorMessage:
      "Arrival-instruction scheduling could not be completed.",
    async execute() {
      const result = await scheduleArrivalInstructionsNotifications();

      return {
        status: result.failed > 0 ? "PARTIAL_SUCCESS" : "SUCCESS",
        result,
        errorCode:
          result.failed > 0
            ? "ARRIVAL_INSTRUCTION_SCHEDULING_PARTIAL_SUCCESS"
            : null,
        errorMessage:
          result.failed > 0
            ? "One or more arrival-instruction notifications could not be scheduled."
            : null,
      };
    },
  },
] as const;

export function listCronJobDefinitions(): readonly CronJobDefinition[] {
  return definitions;
}

export function getCronJobDefinitionByKey(
  key: CronJobKeyValue,
): CronJobDefinition | null {
  return definitions.find((definition) => definition.key === key) ?? null;
}

export function getCronJobDefinitionBySlug(
  slug: string,
): CronJobDefinition | null {
  return definitions.find((definition) => definition.slug === slug) ?? null;
}
