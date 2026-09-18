import { normalizeTimeOfDay } from "@/lib/email/time-of-day";

export const REVIEW_INVITATION_TIMEZONE = "America/Guatemala";
export const REVIEW_INVITATION_ELIGIBILITY_DELAY_MS = 2 * 60 * 60 * 1000;
export const REVIEW_INVITATION_SCHEDULER_CATCH_UP_WINDOW_MS =
  7 * 24 * 60 * 60 * 1000;
export const REVIEW_INVITATION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export type ReviewInvitationTimeResult =
  | Readonly<{
      ok: true;
      checkoutAt: Date;
      eligibleAt: Date;
      normalizedCheckOutTime: string;
      timezone: typeof REVIEW_INVITATION_TIMEZONE;
    }>
  | Readonly<{
      ok: false;
      reason: "INVALID_CHECKOUT_TIME";
      timezone: typeof REVIEW_INVITATION_TIMEZONE;
    }>;

export function addReviewInvitationLifetime(createdAt: Date): Date {
  return new Date(createdAt.getTime() + REVIEW_INVITATION_LIFETIME_MS);
}

export function getReviewInvitationSchedulerCatchUpStart(now: Date): Date {
  return new Date(
    now.getTime() - REVIEW_INVITATION_SCHEDULER_CATCH_UP_WINDOW_MS,
  );
}

export function calculateReviewInvitationTimes(
  checkOutDate: Date,
  checkOutTime: string | null | undefined,
): ReviewInvitationTimeResult {
  if (checkOutTime === null || checkOutTime === undefined) {
    return {
      ok: false,
      reason: "INVALID_CHECKOUT_TIME",
      timezone: REVIEW_INVITATION_TIMEZONE,
    };
  }

  const normalizedCheckOutTime = normalizeTimeOfDay(checkOutTime);

  if (!normalizedCheckOutTime || Number.isNaN(checkOutDate.getTime())) {
    return {
      ok: false,
      reason: "INVALID_CHECKOUT_TIME",
      timezone: REVIEW_INVITATION_TIMEZONE,
    };
  }

  const [hoursSegment, minutesSegment] = normalizedCheckOutTime.split(":");
  const guatemalaHours = Number(hoursSegment);
  const guatemalaMinutes = Number(minutesSegment);

  const checkoutAt = new Date(
    Date.UTC(
      checkOutDate.getUTCFullYear(),
      checkOutDate.getUTCMonth(),
      checkOutDate.getUTCDate(),
      guatemalaHours + 6,
      guatemalaMinutes,
      0,
      0,
    ),
  );

  return {
    ok: true,
    checkoutAt,
    eligibleAt: new Date(
      checkoutAt.getTime() + REVIEW_INVITATION_ELIGIBILITY_DELAY_MS,
    ),
    normalizedCheckOutTime,
    timezone: REVIEW_INVITATION_TIMEZONE,
  };
}
