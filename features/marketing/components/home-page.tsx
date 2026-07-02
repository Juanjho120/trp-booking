import { SiteFooter, SiteHeader } from "@/components/layout";

import { AccommodationShowcase } from "./accommodation-showcase";
import { DirectBookingBenefits } from "./direct-booking-benefits";
import { HeroSection } from "./hero-section";
import { HomepageCtaSection } from "./homepage-cta-section";
import { LocationPreviewSection } from "./location-preview-section";
import { TrustSection } from "./trust-section";

export function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <HeroSection />
        <AccommodationShowcase />
        <DirectBookingBenefits />
        <LocationPreviewSection />
        <TrustSection />
        <HomepageCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
