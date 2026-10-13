import { AdminGenericPageSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminCronJobsLoading() {
  return (
    <AdminGenericPageSkeleton label={esMessages.admin.cronJobs.states.loading} />
  );
}
