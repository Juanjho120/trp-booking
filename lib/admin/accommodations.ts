import type { AccommodationId } from "@/types/accommodation";

export const adminAccommodationIds = [
  "black-white-apartment",
  "perfect-retreat-bungalow",
  "complete-retreat",
] as const satisfies readonly AccommodationId[];

export function isAdminAccommodationId(value: unknown): value is AccommodationId {
  return (
    typeof value === "string" &&
    adminAccommodationIds.includes(value as AccommodationId)
  );
}

export function toAdminAccommodationId(value: string): AccommodationId {
  if (!isAdminAccommodationId(value)) {
    throw new Error(`Unsupported admin accommodation id: ${value}.`);
  }

  return value;
}
