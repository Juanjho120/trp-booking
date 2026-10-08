export type AdminReservationTabCacheStatus =
  | "idle"
  | "loading"
  | "ready"
  | "refreshing"
  | "error";

export function shouldLoadAdminReservationTab({
  force = false,
  stale,
  status,
}: Readonly<{
  force?: boolean;
  stale: boolean;
  status: AdminReservationTabCacheStatus;
}>): boolean {
  if (status === "loading" || status === "refreshing") {
    return false;
  }

  if (force) {
    return true;
  }

  return status === "idle" || (status === "ready" && stale);
}
