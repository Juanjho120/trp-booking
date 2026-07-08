import { SiteFooter, SiteHeader } from "@/components/layout";
import type { Accommodation } from "@/types/accommodation";

import { AccommodationShowcase } from "./accommodation-showcase";
import { DirectBookingBenefits } from "./direct-booking-benefits";
import { HeroSection } from "./hero-section";
import { HomepageCtaSection } from "./homepage-cta-section";
import { LocationPreviewSection } from "./location-preview-section";
import { TrustSection } from "./trust-section";

type HomePageProps = Readonly<{
  accommodations: readonly Accommodation[];
}>;

export function HomePage({ accommodations }: HomePageProps) {
  const featuredAccommodation = accommodations.find(
    (accommodation) => accommodation.id === "complete-retreat",
  ) ?? accommodations[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <HeroSection featuredAccommodation={featuredAccommodation} />
        <AccommodationShowcase accommodations={accommodations} />
        <DirectBookingBenefits />
        <LocationPreviewSection />
        <TrustSection />
        <HomepageCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
