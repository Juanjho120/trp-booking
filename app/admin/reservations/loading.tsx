import { AdminGenericPageSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminReservationsLoading() {
  return (
    <AdminGenericPageSkeleton
      label={esMessages.admin.navigation.loadingPage}
    />
  );
}
