import {
  Prisma,
  type CancellationPolicyReasonCode,
} from "@prisma/client";

export const CANCELLATION_POLICY_TIMEZONE = "America/Guatemala" as const;

const MILLISECONDS_PER_HOUR = 60 * 60 * 1_000;
const FULL_REFUND_THRESHOLD_HOURS = 168;
const PARTIAL_REFUND_THRESHOLD_HOURS = 72;

export type StandardCancellationPolicyTiming = Readonly<{
  hoursBeforeCheckIn: string;
  reasonCode: CancellationPolicyReasonCode;
  refundPercentage: 0 | 50 | 100;
}>;

export function calculateStandardCancellationPolicyTiming(
  checkInAt: Date,
  calculatedAt: Date,
): StandardCancellationPolicyTiming {
  const checkInTimestamp = checkInAt.getTime();
  const calculatedTimestamp = calculatedAt.getTime();

  if (
    !Number.isFinite(checkInTimestamp) ||
    !Number.isFinite(calculatedTimestamp)
  ) {
    throw new Error("Cancellation policy timestamps must be valid dates.");
  }

  const millisecondsBeforeCheckIn = checkInTimestamp - calculatedTimestamp;
  const fullRefundThreshold =
    checkInTimestamp - FULL_REFUND_THRESHOLD_HOURS * MILLISECONDS_PER_HOUR;
  const partialRefundThreshold =
    checkInTimestamp - PARTIAL_REFUND_THRESHOLD_HOURS * MILLISECONDS_PER_HOUR;

  if (calculatedTimestamp <= fullRefundThreshold) {
    return {
      hoursBeforeCheckIn: (
        millisecondsBeforeCheckIn / MILLISECONDS_PER_HOUR
      ).toFixed(6),
      reasonCode: "AT_LEAST_168_HOURS",
      refundPercentage: 100,
    };
  }

  if (calculatedTimestamp <= partialRefundThreshold) {
    return {
      hoursBeforeCheckIn: (
        millisecondsBeforeCheckIn / MILLISECONDS_PER_HOUR
      ).toFixed(6),
      reasonCode: "BETWEEN_72_AND_168_HOURS",
      refundPercentage: 50,
    };
  }

  return {
    hoursBeforeCheckIn: (
      millisecondsBeforeCheckIn / MILLISECONDS_PER_HOUR
    ).toFixed(6),
    reasonCode: "LESS_THAN_72_HOURS",
    refundPercentage: 0,
  };
}

export function calculateStandardCancellationPolicyAmount(
  currentStayValue: Prisma.Decimal,
  refundPercentage: StandardCancellationPolicyTiming["refundPercentage"],
): Prisma.Decimal {
  if (currentStayValue.lessThan(0)) {
    throw new Error("Cancellation policy stay value cannot be negative.");
  }

  return currentStayValue
    .mul(refundPercentage)
    .div(100)
    .toDecimalPlaces(2);
}
