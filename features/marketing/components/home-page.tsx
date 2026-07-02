import { AccommodationShowcase } from "./accommodation-showcase";
import { HeroSection } from "./hero-section";
import { TrustSection } from "./trust-section";

export function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <HeroSection />
      <AccommodationShowcase />
      <TrustSection />
    </main>
  );
}
