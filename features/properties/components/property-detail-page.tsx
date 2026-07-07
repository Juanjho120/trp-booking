import Image from "next/image";
import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAmenityByKey } from "@/config/amenities";
import { esMessages } from "@/messages";
import type { Accommodation } from "@/types/accommodation";

import { AmenityIcon } from "./amenity-icon";

type PropertyDetailPageProps = Readonly<{
  accommodation: Accommodation;
}>;

const messages = esMessages;

export function PropertyDetailPage({ accommodation }: PropertyDetailPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-16">
          <div>
            <Button asChild className="rounded-full" variant="ghost">
              <Link href="/alojamientos">{messages.properties.detail.backToAccommodations}</Link>
            </Button>

            <div className="mt-8">
              <Badge className="rounded-full" variant={accommodation.kind === "composed" ? "default" : "secondary"}>
                {accommodation.kind === "composed"
                  ? messages.properties.detail.composedLabel
                  : messages.properties.detail.privateLabel}
              </Badge>
              <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                {accommodation.name.es}
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground">
                {accommodation.longDescription.es}
              </p>
            </div>
          </div>

          <Card className="h-fit rounded-[2rem] border-border/70 bg-card shadow-lg">
            <CardHeader>
              <CardTitle>{messages.properties.detail.reservationSummary}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {messages.properties.detail.from}
                  </p>
                  <p className="mt-1 text-4xl font-semibold">
                    ${accommodation.baseNightlyPriceUsd}
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      {messages.properties.detail.perNight}
                    </span>
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-2xl bg-muted p-4">
                  <p className="font-semibold text-foreground">{accommodation.maxGuests}</p>
                  <p className="text-xs text-muted-foreground">{messages.properties.detail.guests}</p>
                </div>
                <div className="rounded-2xl bg-muted p-4">
                  <p className="font-semibold text-foreground">{accommodation.bedrooms}</p>
                  <p className="text-xs text-muted-foreground">{messages.properties.detail.bedroomAbbr}</p>
                </div>
                <div className="rounded-2xl bg-muted p-4">
                  <p className="font-semibold text-foreground">{accommodation.bathrooms}</p>
                  <p className="text-xs text-muted-foreground">
                    {accommodation.bathrooms > 1
                      ? messages.properties.detail.bathroomPlural
                      : messages.properties.detail.bathroomSingular}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{accommodation.arrivalPolicy.checkInFrom.es}</p>
                <p className="mt-2 leading-6">{accommodation.arrivalPolicy.earlyCheckInNote.es}</p>
              </div>

              <Button className="mt-6 w-full rounded-full" disabled>
                {messages.properties.detail.calendarComingSoon}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {messages.properties.detail.availabilityLater}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-4">
            {accommodation.galleryImages.map((image) => (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-muted" key={image.src}>
                <Image
                  alt={image.alt.es}
                  className="object-cover transition duration-500 hover:scale-105"
                  fill
                  sizes="(min-width: 1024px) 25vw, 100vw"
                  src={image.src}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              {accommodation.highlights.es.map((highlight) => (
                <div className="rounded-2xl border border-border bg-card p-5 text-sm font-medium text-foreground" key={highlight}>
                  {highlight}
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                {messages.properties.detail.mainAmenities}
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {accommodation.amenityKeys.map((amenityKey) => {
                  const amenity = getAmenityByKey(amenityKey);

                  return (
                    <div
                      className="flex items-center gap-3 rounded-2xl bg-muted p-4 text-sm text-foreground"
                      key={amenity.key}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
                        <AmenityIcon icon={amenity.icon} />
                      </span>
                      <span>{amenity.label.es}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted/35 py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <Badge className="rounded-full" variant="secondary">
                {messages.properties.detail.rulesBadge}
              </Badge>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                {messages.properties.detail.beforeBooking}
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {messages.properties.detail.rulesDescription}
              </p>
            </div>

            <Card className="rounded-[2rem] border-border/70 bg-card">
              <CardContent className="p-6">
                <div className="grid gap-3">
                  {accommodation.rules.es.map((rule) => (
                    <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground" key={rule}>
                      {rule}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
