export type PropertyTimeOption = Readonly<{
  value: string;
  label: string;
}>;

const HALF_HOUR_MINUTES = 30;
const MINUTES_PER_DAY = 24 * 60;
const TWELVE_HOUR_TIME_PATTERN =
  /^(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?$/i;
const TWENTY_FOUR_HOUR_TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

function toCanonicalPropertyTime(hour24: number, minute: number): string {
  const period = hour24 < 12 ? "a.m." : "p.m.";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function toTwentyFourHourLabel(hour24: number, minute: number): string {
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parsePropertyTime(value: string): Readonly<{
  hour24: number;
  minute: number;
}> | null {
  const normalizedValue = value.trim().toLowerCase();
  const twentyFourHourMatch = normalizedValue.match(
    TWENTY_FOUR_HOUR_TIME_PATTERN,
  );

  if (twentyFourHourMatch) {
    const hour24 = Number(twentyFourHourMatch[1]);
    const minute = Number(twentyFourHourMatch[2]);

    if (
      hour24 >= 0 &&
      hour24 <= 23 &&
      (minute === 0 || minute === HALF_HOUR_MINUTES)
    ) {
      return { hour24, minute };
    }

    return null;
  }

  const twelveHourMatch = normalizedValue.match(TWELVE_HOUR_TIME_PATTERN);

  if (!twelveHourMatch) {
    return null;
  }

  const hour12 = Number(twelveHourMatch[1]);
  const minute = Number(twelveHourMatch[2]);
  const period = twelveHourMatch[3];

  if (
    hour12 < 1 ||
    hour12 > 12 ||
    (minute !== 0 && minute !== HALF_HOUR_MINUTES)
  ) {
    return null;
  }

  const hour24 =
    period === "a" ? hour12 % 12 : hour12 === 12 ? 12 : hour12 + 12;

  return { hour24, minute };
}

export const propertyTimeOptions: readonly PropertyTimeOption[] = Array.from(
  { length: MINUTES_PER_DAY / HALF_HOUR_MINUTES },
  (_, index) => {
    const totalMinutes = index * HALF_HOUR_MINUTES;
    const hour24 = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    return {
      value: toCanonicalPropertyTime(hour24, minute),
      label: toTwentyFourHourLabel(hour24, minute),
    };
  },
);

export function normalizePropertyTimeValue(value: string): string | null {
  const parsedTime = parsePropertyTime(value);

  return parsedTime
    ? toCanonicalPropertyTime(parsedTime.hour24, parsedTime.minute)
    : null;
}

export function isPropertyTimeValue(value: string): boolean {
  return normalizePropertyTimeValue(value) !== null;
}

export function formatPropertyTimeLabel(value: string): string {
  const parsedTime = parsePropertyTime(value);

  return parsedTime
    ? toTwentyFourHourLabel(parsedTime.hour24, parsedTime.minute)
    : value;
}
