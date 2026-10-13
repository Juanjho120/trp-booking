import { AdminAccommodationListSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminAccommodationsLoading() {
  return (
    <AdminAccommodationListSkeleton
      label={esMessages.admin.accommodations.states.loading}
    />
  );
}
