import { AdminCalendarRouteSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminCalendarLoading() {
  return (
    <AdminCalendarRouteSkeleton label={esMessages.admin.calendar.states.loading} />
  );
}
