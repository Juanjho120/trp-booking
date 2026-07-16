import type { Metadata } from "next";

import { AdminPropertyCalendarView } from "@/features/admin";
import {
  adminAccommodationIds,
  getAdminPropertyCalendar,
  isAdminAccommodationId,
} from "@/lib/admin";
import { dateOnlyFromDate } from "@/lib/availability/rules";
import { esMessages } from "@/messages";

type AdminCalendarPageProps = Readonly<{
  searchParams: Promise<{
    propertyId?: string;
    month?: string;
  }>;
}>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: esMessages.admin.calendar.seoTitle,
  robots: {
    index: false,
    follow: false,
  },
};

function isValidCalendarMonth(value: string | undefined): value is string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value ?? "");

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const parsed = new Date(Date.UTC(year, month - 1, 1));

  return (
    year >= 100 &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1
  );
}

export default async function AdminCalendarPage({
  searchParams,
}: AdminCalendarPageProps) {
  const params = await searchParams;
  const today = dateOnlyFromDate(new Date());
  const propertyId = isAdminAccommodationId(params.propertyId)
    ? params.propertyId
    : adminAccommodationIds[0];
  const month = isValidCalendarMonth(params.month)
    ? params.month
    : today.slice(0, 7);
  const calendar = await getAdminPropertyCalendar({
    propertyId,
    month,
  });

  return <AdminPropertyCalendarView initialCalendar={calendar} />;
}
