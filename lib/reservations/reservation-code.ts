import { randomInt } from "node:crypto";

export const RESERVATION_CODE_PREFIX = "TR";
export const RESERVATION_CODE_RANDOM_LENGTH = 6;
export const RESERVATION_CODE_LENGTH =
  RESERVATION_CODE_PREFIX.length + RESERVATION_CODE_RANDOM_LENGTH;
export const RESERVATION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const RESERVATION_CODE_MAX_GENERATION_ATTEMPTS = 8;

const RESERVATION_CODE_PATTERN = /^TR[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export function generateReservationCode(): string {
  let suffix = "";

  for (let index = 0; index < RESERVATION_CODE_RANDOM_LENGTH; index += 1) {
    suffix +=
      RESERVATION_CODE_ALPHABET[randomInt(RESERVATION_CODE_ALPHABET.length)];
  }

  return `${RESERVATION_CODE_PREFIX}${suffix}`;
}

export function isReservationCode(value: unknown): value is string {
  return typeof value === "string" && RESERVATION_CODE_PATTERN.test(value);
}
