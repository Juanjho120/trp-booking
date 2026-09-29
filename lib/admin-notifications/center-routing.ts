export const ADMIN_NOTIFICATION_CENTER_PATH = "/admin/notifications";
export const ADMIN_NOTIFICATION_MOBILE_MEDIA_QUERY = "(max-width: 767px)";

const ADMIN_NOTIFICATION_ID_MAX_LENGTH = 160;
const ADMIN_NOTIFICATION_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export type AdminNotificationsDisplayMode = "browser" | "standalone";

export function normalizeAdminNotificationId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (
    !trimmed ||
    trimmed.length > ADMIN_NOTIFICATION_ID_MAX_LENGTH ||
    !ADMIN_NOTIFICATION_ID_PATTERN.test(trimmed)
  ) {
    return null;
  }

  return trimmed;
}

export function buildAdminNotificationCenterDeepLink(
  notificationId: unknown,
): string {
  const normalizedId = normalizeAdminNotificationId(notificationId);

  if (!normalizedId) {
    return ADMIN_NOTIFICATION_CENTER_PATH;
  }

  const params = new URLSearchParams({ notification: normalizedId });

  return `${ADMIN_NOTIFICATION_CENTER_PATH}?${params.toString()}`;
}

export function shouldShowAdminNotificationConfiguration(
  input: Readonly<{
    isMobileViewport: boolean;
    displayMode: AdminNotificationsDisplayMode;
  }>,
): boolean {
  return input.isMobileViewport || input.displayMode === "standalone";
}

export function resolveAdminNotificationInitialOpenId(
  input: Readonly<{
    requestedNotificationId: unknown;
    notifications: readonly Readonly<{ id: string }>[];
  }>,
): string | null {
  const normalizedId = normalizeAdminNotificationId(
    input.requestedNotificationId,
  );

  if (!normalizedId) {
    return null;
  }

  return input.notifications.some(
    (notification) => notification.id === normalizedId,
  )
    ? normalizedId
    : null;
}

export function mergeTargetedAdminNotification<
  TNotification extends Readonly<{ id: string }>,
>(
  notifications: readonly TNotification[],
  targetedNotification: TNotification | null,
): readonly TNotification[] {
  if (!targetedNotification) {
    return notifications;
  }

  if (
    notifications.some(
      (notification) => notification.id === targetedNotification.id,
    )
  ) {
    return notifications;
  }

  return [targetedNotification, ...notifications];
}
