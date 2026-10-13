import { AdminCalendarIntegrationsSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminCalendarIntegrationsLoading() {
  return (
    <AdminCalendarIntegrationsSkeleton
      label={esMessages.admin.calendarIntegrations.states.loading}
    />
  );
}
