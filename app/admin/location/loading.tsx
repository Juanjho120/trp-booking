import { AdminGenericPageSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminLocationLoading() {
  return (
    <AdminGenericPageSkeleton
      label={esMessages.admin.publicLocation.states.loading}
    />
  );
}
