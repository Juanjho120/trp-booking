type EmailNotificationLike = Readonly<{
  type: string;
}>;

export function groupAdminReservationEmailNotifications<
  T extends EmailNotificationLike,
>(
  notifications: readonly T[],
): Readonly<{
  administration: T[];
  guest: T[];
}> {
  const guest: T[] = [];
  const administration: T[] = [];

  notifications.forEach((notification) => {
    if (notification.type.startsWith("ADMIN_")) {
      administration.push(notification);
    } else {
      guest.push(notification);
    }
  });

  return { administration, guest };
}

export function getAdminReservationEmailNotificationTypeLabel(
  labels: object,
  type: string,
): string {
  const value = (labels as Record<string, unknown>)[type];
  return typeof value === "string" ? value : type;
}
