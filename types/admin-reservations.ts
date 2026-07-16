import type { AdminPagination, AdminPropertyOption } from "@/types/admin";
import type { DateOnlyString } from "@/types/availability";

export type AdminReservationListItem = Readonly<{
  id: string;
  property: AdminPropertyOption;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  guestCountry: string | null;
  checkInDate: DateOnlyString;
  checkOutDate: DateOnlyString;
  guestCount: number;
  status: string;
  total: string;
  currency: string;
  expiresAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  latestPaymentStatus: string | null;
}>;

export type AdminReservationFilters = Readonly<{
  search?: string;
  propertyId?: string;
  status?: string;
  page?: number;
}>;

export type AdminReservationsPageData = Readonly<{
  generatedAt: string;
  properties: readonly AdminPropertyOption[];
  filters: AdminReservationFilters;
  pagination: AdminPagination;
  reservations: readonly AdminReservationListItem[];
}>;
