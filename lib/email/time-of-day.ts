export type NormalizedTimeOfDay = `${number}:${number}`;

function formatTimeOfDay(
  hours: number,
  minutes: string,
): NormalizedTimeOfDay {
  return `${String(hours).padStart(2, "0")}:${minutes}` as NormalizedTimeOfDay;
}

export function normalizeTimeOfDay(
  value: string,
): NormalizedTimeOfDay | null {
  const compactValue = value.trim().toLowerCase().replace(/\s+/g, "");

  const twentyFourHourMatch =
    /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(compactValue);

  if (twentyFourHourMatch) {
    return formatTimeOfDay(
      Number(twentyFourHourMatch[1]),
      twentyFourHourMatch[2],
    );
  }

  const twelveHourMatch =
    /^(0?[1-9]|1[0-2]):([0-5]\d)(a\.?m\.?|p\.?m\.?)$/.exec(
      compactValue,
    );

  if (!twelveHourMatch) {
    return null;
  }

  let hours = Number(twelveHourMatch[1]);
  const minutes = twelveHourMatch[2];
  const period = twelveHourMatch[3].startsWith("p") ? "pm" : "am";

  if (period === "am" && hours === 12) {
    hours = 0;
  }

  if (period === "pm" && hours !== 12) {
    hours += 12;
  }

  return formatTimeOfDay(hours, minutes);
}