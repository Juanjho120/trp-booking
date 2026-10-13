import { AdminAccommodationEditorSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminAccommodationAmenitiesRulesLoading() {
  return (
    <AdminAccommodationEditorSkeleton
      label={esMessages.admin.accommodations.states.amenitiesRulesLoading}
      variant="amenities"
    />
  );
}
