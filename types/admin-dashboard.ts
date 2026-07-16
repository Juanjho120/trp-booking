import type { AdminPropertyOption } from "@/types/admin";
import type { DateOnlyString } from "@/types/availability";

export type AdminDashboardArrival = Readonly<{
  id: string;
  property: AdminPropertyOption;
  guestName: string;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  guestCount: number;
}>;

export type AdminDashboardSummary = Readonly<{
  generatedAt: string;
  stats: Readonly<{
    activePendingReservations: number;
    upcomingConfirmedReservations: number;
    paymentIssues: number;
    activeManualBlocks: number;
  }>;
  upcomingArrivals: readonly AdminDashboardArrival[];
}>;
