import { AdminAccommodationEditorSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminAccommodationPhotosLoading() {
  return (
    <AdminAccommodationEditorSkeleton
      label={esMessages.admin.accommodations.states.photosLoading}
      variant="photos"
    />
  );
}
