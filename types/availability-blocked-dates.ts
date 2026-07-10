import type { AccommodationId } from "@/types/accommodation";
import type { DateOnlyString } from "@/types/availability";

export type BlockedDatesApiResponse = Readonly<{
  accommodationId: AccommodationId;
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  blockedDates: DateOnlyString[];
}>;
