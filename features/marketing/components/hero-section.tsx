import Link from "next/link";
import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

const heroHighlights = [
  {
    icon: MapPin,
    label: "Panajachel, Guatemala",
  },
  {
    icon: CalendarDays,
    label: "Direct booking with Airbnb calendar sync",
  },
  {
    icon: ShieldCheck,
    label: "Secure online payment flow",
  },
] as const;

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--muted))_48%,hsl(var(--accent))_100%)] px-6 py-20 sm:py-24 lg:px-8">
      <div className="absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-primary/10 to-transparent" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col items-start gap-8">
          <Badge variant="secondary" className="rounded-full px-4 py-2 text-sm">
            {siteConfig.publicName}
          </Badge>

          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-primary">
              TRP Booking
            </p>

            <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Your private retreat near Lake Atitlán.
            </h1>

            <p className="max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              Book private accommodations in Panajachel directly with {" "}
              {siteConfig.brandName}. Enjoy clear availability, professional
              communication, and a comfortable stay close to Lake Atitlán.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="#accommodations">View accommodations</Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="rounded-full px-7">
              <Link href="#booking-preview">How booking works</Link>
            </Button>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            {heroHighlights.map((highlight) => {
              const Icon = highlight.icon;

              return (
                <div key={highlight.label} className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span>{highlight.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="overflow-hidden border-border/70 bg-card/85 shadow-2xl shadow-primary/10 backdrop-blur">
          <CardContent className="p-0">
            <div className="aspect-[4/3] bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.28),transparent_32%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))] p-6">
              <div className="flex h-full flex-col justify-between rounded-[2rem] border border-white/30 bg-background/75 p-6 shadow-xl backdrop-blur-sm">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">
                    Coming soon
                  </p>
                  <h2 className="mt-4 max-w-sm text-3xl font-semibold tracking-tight">
                    Direct reservations for {siteConfig.brandName}
                  </h2>
                </div>

                <div className="grid gap-3 rounded-3xl bg-card/90 p-4 text-sm text-muted-foreground shadow-sm">
                  <div className="flex items-center justify-between">
                    <span>Availability</span>
                    <span className="font-medium text-foreground">Airbnb iCal sync</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Payments</span>
                    <span className="font-medium text-foreground">Tilopay</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Notifications</span>
                    <span className="font-medium text-foreground">Resend</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
