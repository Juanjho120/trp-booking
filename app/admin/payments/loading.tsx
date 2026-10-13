import { AdminPaymentsPageSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminPaymentsLoading() {
  return (
    <AdminPaymentsPageSkeleton
      label={esMessages.admin.paymentsPage.states.loading}
    />
  );
}
