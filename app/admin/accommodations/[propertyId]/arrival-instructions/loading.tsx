import { AdminAccommodationEditorSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminAccommodationArrivalInstructionsLoading() {
  return (
    <AdminAccommodationEditorSkeleton
      label={esMessages.admin.accommodations.states.arrivalInstructionsLoading}
      variant="arrival"
    />
  );
}
