import { AdminAccommodationEditorSkeleton } from "@/features/admin/components/admin-loading-skeletons";
import { esMessages } from "@/messages/es";

export default function AdminAccommodationPricingLoading() {
  return (
    <AdminAccommodationEditorSkeleton
      label={esMessages.admin.accommodations.states.pricingLoading}
      variant="pricing"
    />
  );
}
