import { AdminGenericPageSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminReservationDetailLoading() {
  return (
    <AdminGenericPageSkeleton
      label={esMessages.admin.navigation.loadingPage}
    />
  );
}
