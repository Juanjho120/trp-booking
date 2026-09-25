const ADMIN_PATH_PATTERN = /^\/admin(?:\/|$)/;
const DEFAULT_ADMIN_TARGET_PATH = "/admin/notifications";

export type AdminNotificationTarget =
  | Readonly<{
      kind: "reservation";
      reservationId: string;
    }>
  | Readonly<{
      kind: "reviews";
    }>
  | Readonly<{
      kind: "notifications";
    }>;

function normalizeReservationId(value: string): string {
  const normalized = value.trim();

  if (!normalized || normalized.length > 128) {
    throw new TypeError("Invalid admin notification reservation target.");
  }

  return normalized;
}

export function resolveAdminNotificationTarget(
  target: AdminNotificationTarget,
): Readonly<{ targetPath: string }> {
  if (target.kind === "reservation") {
    return {
      targetPath: `/admin/reservations/${encodeURIComponent(
        normalizeReservationId(target.reservationId),
      )}`,
    };
  }

  if (target.kind === "reviews") {
    return {
      targetPath: "/admin/reviews",
    };
  }

  return {
    targetPath: DEFAULT_ADMIN_TARGET_PATH,
  };
}

export function isSafeAdminNotificationTargetPath(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed, "https://turefugioperfecto.com");
  } catch {
    return false;
  }

  return (
    parsed.origin === "https://turefugioperfecto.com" &&
    ADMIN_PATH_PATTERN.test(parsed.pathname)
  );
}

export function coerceAdminNotificationTargetPath(value: string): string {
  return isSafeAdminNotificationTargetPath(value)
    ? value.trim()
    : DEFAULT_ADMIN_TARGET_PATH;
}

export function buildAbsoluteAdminNotificationTargetUrl(
  targetPath: string,
  publicBaseUrl: string,
): string {
  const baseUrl = new URL(publicBaseUrl);
  baseUrl.hash = "";
  baseUrl.search = "";

  if (!baseUrl.pathname.endsWith("/")) {
    baseUrl.pathname = `${baseUrl.pathname}/`;
  }

  return new URL(coerceAdminNotificationTargetPath(targetPath), baseUrl).toString();
}
