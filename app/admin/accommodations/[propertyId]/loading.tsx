import { AdminAccommodationEditorSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminAccommodationContentLoading() {
  return (
    <AdminAccommodationEditorSkeleton
      label={esMessages.admin.accommodations.states.editorLoading}
      variant="content"
    />
  );
}
