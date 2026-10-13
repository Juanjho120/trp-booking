import { AdminCatalogPageSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminCatalogsLoading() {
  return (
    <AdminCatalogPageSkeleton label={esMessages.admin.catalogs.states.loading} />
  );
}
